import { constants, mkdirSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { access, open, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Database } from 'bun:sqlite'

export function mediaDirectories(databasePath: string) {
  const root = join(dirname(databasePath), 'media')
  const library = join(root, 'library')
  return { uploads: join(root, 'uploads'), library, posters: join(library, '.posters') }
}

export function mediaMime(name: string) {
  if (!name || name.startsWith('.') || /[/\\\x00-\x1f]/.test(name) || name.length > 200) return null
  const extension = name.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' }
  return extension && Object.hasOwn(types, extension) ? types[extension]! : null
}

export function posterFileName(name: string) {
  return name.replace(/\.[^.]+$/, '.jpg')
}

const libraryExtensions = new Set(['webp', 'mp4', 'webm'])

export function sanitizeLibraryName(raw: string, extension: string) {
  const safeExtension = libraryExtensions.has(extension) ? extension : 'webp'
  let base = raw.replace(/\.[^.]+$/, '').replace(/[/\\\x00-\x1f]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, 60).trim()
  if (!base || base.startsWith('.') || base === '..') base = 'Hintergrund'
  return `${base}.${safeExtension}`
}

export function initializeMedia(connection: Database, databasePath: string) {
  const dirs = mediaDirectories(databasePath)
  mkdirSync(dirs.uploads, { recursive: true })
  mkdirSync(dirs.library, { recursive: true })
  mkdirSync(dirs.posters, { recursive: true })
  const columns = connection.query<{ name: string }, []>('PRAGMA table_info(appearance)').all()
  for (const column of ['media_file', 'media_type']) {
    if (!columns.some(entry => entry.name === column)) connection.exec(`ALTER TABLE appearance ADD COLUMN ${column} TEXT`)
  }
  // Write/rename first. Clear each BLOB only after its file is durably written.
  for (const row of connection.query<{ owner: string, image: Uint8Array }, []>('SELECT owner, image FROM appearance WHERE image IS NOT NULL').all()) {
    const version = crypto.randomUUID()
    const name = `${version}.webp`
    const path = join(dirs.uploads, name)
    try {
      writeFileSync(path + '.tmp', row.image, { flag: 'wx', mode: 0o600, flush: true })
      renameSync(path + '.tmp', path)
      connection.query('UPDATE appearance SET image = NULL, image_version = ?, media_file = ?, media_type = ? WHERE owner = ?')
        .run(version, name, 'image/webp', row.owner)
    } catch (error) {
      try { unlinkSync(path + '.tmp') } catch {}
      throw error
    }
  }
}

export async function openMedia(directory: string, name: string) {
  if (!mediaMime(name)) throw new Error('Invalid media filename')
  // Never follow a symlink supplied through the shared directory.
  const file = await open(join(directory, name), constants.O_RDONLY | constants.O_NOFOLLOW)
  const stat = await file.stat()
  if (!stat.isFile() || stat.size === 0) { await file.close(); throw new Error('Invalid media file') }
  return { file, size: stat.size }
}

export async function listMedia(directory: string, postersDirectory: string) {
  const result: { id: `library:${string}`, label: string, type: string, poster: boolean }[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const type = mediaMime(entry.name)
    if (!entry.isFile() || !type) continue
    const poster = type.startsWith('video/') && await fileExists(join(postersDirectory, posterFileName(entry.name)))
    result.push({ id: `library:${entry.name}`, label: entry.name.replace(/\.[^.]+$/, ''), type, poster })
  }
  return result.sort((a, b) => a.label.localeCompare(b.label, 'de'))
}

async function fileExists(path: string) {
  try { await access(path, constants.F_OK); return true }
  catch { return false }
}

export function byteRange(header: string | undefined, size: number) {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) throw new Error('Invalid range')
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) throw new Error('Unsatisfiable range')
  return { start, end }
}

export function isVideoHeader(buffer: Uint8Array, type: string) {
  // Container signature check, not codec validation/transcoding.
  if (type === 'video/mp4') return buffer.length >= 12 && Buffer.from(buffer.subarray(4, 8)).toString() === 'ftyp'
  return type === 'video/webm' && buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3
}
