import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { Database } from 'bun:sqlite'
import type { H3Event } from 'h3'

interface Credentials {
  loginName: string
  appPassword: string
}

interface EncryptedConnection {
  base_url: string
  nonce: Uint8Array
  tag: Uint8Array
  ciphertext: Uint8Array
}

export function cloudEncryptionKey(event: H3Event) {
  const encoded = useRuntimeConfig(event).nextcloudEncryptionKey.trim()
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32 || key.toString('base64') !== encoded) {
    throw createError({ statusCode: 503, statusMessage: 'Nextcloud encryption key is not configured' })
  }
  return key
}

function connectionContext(owner: string, baseUrl: string) {
  return Buffer.from(JSON.stringify(['heute-nextcloud-v1', owner, baseUrl]))
}

export function saveCloudConnection(connection: Database, owner: string, baseUrl: string, key: Buffer, credentials: Credentials) {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  cipher.setAAD(connectionContext(owner, baseUrl))
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()])
  connection.query(`
    INSERT INTO nextcloud_connections (owner, base_url, nonce, tag, ciphertext) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (owner) DO UPDATE SET base_url = excluded.base_url, nonce = excluded.nonce,
      tag = excluded.tag, ciphertext = excluded.ciphertext
  `).run(owner, baseUrl, nonce, cipher.getAuthTag(), ciphertext)
}

function decryptCloudConnection(row: EncryptedConnection | null, owner: string, baseUrl: string, key: Buffer): Credentials | null {
  if (!row || row.base_url !== baseUrl) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, row.nonce, { authTagLength: 16 })
    decipher.setAAD(connectionContext(owner, baseUrl))
    decipher.setAuthTag(row.tag)
    const data = JSON.parse(Buffer.concat([decipher.update(row.ciphertext), decipher.final()]).toString('utf8'))
    return typeof data?.loginName === 'string' && typeof data.appPassword === 'string' ? data : null
  } catch {
    return null
  }
}

export function findCloudConnection(connection: Database, owner: string, baseUrl: string, key: Buffer) {
  const row = connection.query<EncryptedConnection, [string]>(
    'SELECT base_url, nonce, tag, ciphertext FROM nextcloud_connections WHERE owner = ?'
  ).get(owner)
  return decryptCloudConnection(row, owner, baseUrl, key)
}

export function removeCloudConnection(connection: Database, owner: string, baseUrl: string, key: Buffer) {
  const row = connection.query<EncryptedConnection, [string]>(
    'DELETE FROM nextcloud_connections WHERE owner = ? RETURNING base_url, nonce, tag, ciphertext'
  ).get(owner)
  return { removed: Boolean(row), credentials: decryptCloudConnection(row, owner, baseUrl, key) }
}

export function cloudHeaders(credentials: Credentials) {
  return {
    Authorization: 'Basic ' + Buffer.from(credentials.loginName + ':' + credentials.appPassword).toString('base64'),
    'OCS-APIRequest': 'true',
    Accept: 'application/json'
  }
}
