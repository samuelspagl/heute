import { afterAll, beforeEach, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import * as h3 from 'h3'
import { initializeMedia, mediaDirectories } from '../../server/utils/media/storage'

const root = mkdtempSync(join(tmpdir(), 'heute-media-routes-'))
const path = join(root, 'heute.sqlite')
const connection = new Database(path)
connection.exec(`CREATE TABLE appearance (
  owner TEXT PRIMARY KEY, wallpaper TEXT NOT NULL, image BLOB, image_version TEXT,
  icon_size INTEGER DEFAULT 56, label_size INTEGER DEFAULT 14, widget_width INTEGER DEFAULT 316,
  overlay_opacity INTEGER DEFAULT 100
)`)
initializeMedia(connection, path)
const dirs = mediaDirectories(path)
// Emulate Nitro's auto-import bindings while exercising the actual route handlers.
const bindings = {
  defineEventHandler: h3.defineEventHandler, createError: h3.createError,
  getHeader: h3.getHeader, getQuery: h3.getQuery, readBody: h3.readBody,
  requireSameOrigin: (event: h3.H3Event) => {
    if (h3.getHeader(event, 'origin') !== 'https://heute.test') throw h3.createError({ statusCode: 403 })
  },
  requireMember: async (event: h3.H3Event) => {
    const id = h3.getHeader(event, 'x-test-user')
    if (!id) throw h3.createError({ statusCode: 401 })
    return { id, admin: h3.getHeader(event, 'x-test-admin') === 'true' }
  },
  db: () => connection,
  useRuntimeConfig: () => ({ databasePath: path }),
  getAppearance: (db: Database, owner: string) => db.query('SELECT wallpaper, image_version AS imageVersion, media_type AS mediaType FROM appearance WHERE owner = ?').get(owner)
}
const previous = new Map(Object.keys(bindings).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
Object.assign(globalThis, bindings)
const post = (await import('../../server/api/appearance/image.post')).default
const get = (await import('../../server/api/appearance/image.get')).default
const remove = (await import('../../server/api/appearance/image.delete')).default
const update = (await import('../../server/api/appearance/index.put')).default
const library = (await import('../../server/api/appearance/library.get')).default
const sharedFile = (await import('../../server/api/appearance/library-file.get')).default
const libraryUpload = (await import('../../server/api/appearance/library.post')).default
const libraryDelete = (await import('../../server/api/appearance/library.delete')).default
const posterPost = (await import('../../server/api/appearance/poster.post')).default
const posterGet = (await import('../../server/api/appearance/poster.get')).default
const libraryPosterPost = (await import('../../server/api/appearance/library-poster.post')).default
const libraryPosterGet = (await import('../../server/api/appearance/library-poster.get')).default
const router = h3.createRouter()
router.post('/image', post).get('/image', get).delete('/image', remove).put('/appearance', update).get('/library', library).get('/library-file', sharedFile).post('/library', libraryUpload).delete('/library', libraryDelete)
router.post('/poster', posterPost).get('/poster', posterGet).post('/library-poster', libraryPosterPost).get('/library-poster', libraryPosterGet)
const app = h3.createApp().use(router)
const request = h3.toWebHandler(app)
function call(route: string, method = 'GET', body?: BodyInit, headers: Record<string, string> = {}) {
  return request(new Request('https://heute.test' + route, { method, body, headers: { origin: 'https://heute.test', 'x-test-user': 'alice', ...headers } }))
}
beforeEach(() => { connection.exec('DELETE FROM appearance') })
afterAll(() => {
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else Reflect.deleteProperty(globalThis, key)
  }
  connection.close()
  rmSync(root, { recursive: true, force: true })
})

test('image uploads normalize to a private file and can be replaced with streamed video', async () => {
  const input = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#aabbcc' } }).png().toBuffer()
  const upload = await call('/image', 'POST', input, { 'content-type': 'image/png' })
  expect(upload.status).toBe(200)
  const image = await upload.json() as { imageVersion: string, mediaType: string }
  expect(image.mediaType).toBe('image/webp')
  const stored = connection.query<{ media_file: string, image: null }, []>('SELECT media_file, image FROM appearance').get()!
  expect(stored.image).toBeNull()
  expect(readdirSync(dirs.uploads)).toContain(stored.media_file)
  const downloaded = await call('/image?v=' + image.imageVersion)
  expect((await sharp(Buffer.from(await downloaded.arrayBuffer())).metadata()).format).toBe('webp')
  expect((await call('/image', 'GET', undefined, { 'x-test-user': 'bob' })).status).toBe(404)
  expect((await call('/image?v=stale')).status).toBe(404)
  expect((await call('/image', 'POST', 'bad replacement', { 'content-type': 'video/mp4' })).status).toBe(422)
  expect(readdirSync(dirs.uploads)).toContain(stored.media_file)
  const preserved = await call('/image?v=' + image.imageVersion)
  expect(preserved.status).toBe(200)
  await preserved.arrayBuffer()
  const video = Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50, 0, 1, 2, 3])
  expect((await call('/image', 'POST', video, { 'content-type': 'video/mp4' })).status).toBe(200)
  expect(readdirSync(dirs.uploads)).not.toContain(stored.media_file)
  const partial = await call('/image', 'GET', undefined, { range: 'bytes=4-7' })
  expect(partial.status).toBe(206)
  expect(await partial.text()).toBe('ftyp')
  expect((await call('/image', 'DELETE')).status).toBe(200)
  expect((await call('/image')).status).toBe(404)
  expect(connection.query('SELECT media_file, media_type, image_version, wallpaper FROM appearance').get())
    .toEqual({ media_file: null, media_type: null, image_version: null, wallpaper: 'rose-waves' })
})

test('rejects unauthenticated, cross-origin, oversized and malformed uploads without temp files', async () => {
  const original = readdirSync(dirs.uploads)
  expect((await call('/image', 'POST', 'x', { 'content-type': 'image/png', 'x-test-user': '' })).status).toBe(401)
  expect((await call('/image', 'POST', 'x', { 'content-type': 'image/png', origin: 'https://other.test' })).status).toBe(403)
  expect((await call('/image', 'POST', 'x', { 'content-type': 'video/mp4', 'content-length': String(65 * 1024 * 1024) })).status).toBe(413)
  expect((await call('/image', 'POST', new Uint8Array(8 * 1024 * 1024 + 1), { 'content-type': 'image/png' })).status).toBe(413)
  expect((await call('/image', 'POST', 'not-video', { 'content-type': 'video/mp4' })).status).toBe(422)
  expect((await call('/image', 'POST', 'not-image', { 'content-type': 'image/png' })).status).toBe(422)
  expect((await call('/image', 'POST', '<svg/>', { 'content-type': 'image/svg+xml' })).status).toBe(415)
  expect(readdirSync(dirs.uploads)).toEqual(original)
})

test('shared library can be selected, requires login, rejects traversal and missing entries', async () => {
  writeFileSync(join(dirs.library, 'Forest.webm'), Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  const listing = await call('/library')
  expect(await listing.json()).toEqual([{ id: 'library:Forest.webm', label: 'Forest', type: 'video/webm', poster: false }])
  const select = (wallpaper: string) => call('/appearance', 'PUT', JSON.stringify({ wallpaper }), { 'content-type': 'application/json' })
  expect((await select('library:Forest.webm')).status).toBe(200)
  expect((await select('library:missing.mp4')).status).toBe(404)
  expect((await select('library:../secret.mp4')).status).toBe(404)
  expect((await call('/library-file?name=Forest.webm', 'GET', undefined, { 'x-test-user': '' })).status).toBe(401)
  const video = await call('/library-file?name=Forest.webm')
  expect(video.headers.get('content-type')).toBe('video/webm')
  expect((await video.arrayBuffer()).byteLength).toBe(4)
})

test('admin can upload, replace and delete shared library media', async () => {
  const admin = { 'x-test-admin': 'true' }
  const image = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#112233' } }).png().toBuffer()
  expect((await call('/library?name=Admin.png', 'POST', image, { 'content-type': 'image/png' })).status).toBe(403)
  expect((await call('/library?name=Admin.webp', 'DELETE')).status).toBe(403)

  const uploaded = await call('/library?name=Admin.png', 'POST', image, { 'content-type': 'image/png', ...admin })
  expect(uploaded.status).toBe(200)
  expect(await uploaded.json()).toEqual({ id: 'library:Admin.webp', label: 'Admin' })
  expect(readdirSync(dirs.library)).toContain('Admin.webp')

  expect((await call('/library?name=Admin.png', 'POST', image, { 'content-type': 'image/png', ...admin })).status).toBe(200)
  expect(readdirSync(dirs.library).filter(name => name === 'Admin.webp')).toHaveLength(1)

  expect((await call('/library?name=..%2Fevil.png', 'POST', image, { 'content-type': 'image/png', ...admin })).status).toBe(200)
  expect(readdirSync(dirs.library).some(name => name.includes('evil'))).toBe(false)

  expect((await call('/library?name=Admin.webp', 'DELETE', undefined, admin)).status).toBe(200)
  expect(readdirSync(dirs.library)).not.toContain('Admin.webp')
  expect((await call('/library?name=Admin.webp', 'DELETE', undefined, admin)).status).toBe(404)
})

test('video posters can be uploaded and served for personal and library media', async () => {
  const admin = { 'x-test-admin': 'true' }
  const jpeg = await sharp({ create: { width: 8, height: 5, channels: 3, background: '#aabbcc' } }).jpeg().toBuffer()
  const video = Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50, 0, 1, 2, 3])

  expect((await call('/image', 'POST', video, { 'content-type': 'video/mp4' })).status).toBe(200)
  expect((await call('/poster', 'POST', jpeg, { 'content-type': 'image/jpeg' })).status).toBe(200)
  const personal = await call('/poster')
  expect(personal.status).toBe(200)
  expect(personal.headers.get('content-type')).toBe('image/jpeg')
  expect((await personal.arrayBuffer()).byteLength).toBeGreaterThan(0)

  expect((await call('/library?name=Poster.mp4', 'POST', video, { 'content-type': 'video/mp4', ...admin })).status).toBe(200)
  expect((await call('/library-poster?name=Poster.mp4', 'POST', jpeg, { 'content-type': 'image/jpeg', ...admin })).status).toBe(200)
  expect(readdirSync(dirs.posters)).toContain('Poster.jpg')
  const libPoster = await call('/library-poster?name=Poster.mp4')
  expect(libPoster.status).toBe(200)
  expect(libPoster.headers.get('content-type')).toBe('image/jpeg')
  expect((await call('/library').then(r => r.json())).find((x: { id: string }) => x.id === 'library:Poster.mp4').poster).toBe(true)

  expect((await call('/library-poster?name=Poster.mp4', 'POST', jpeg, { 'content-type': 'image/jpeg' })).status).toBe(403)
  expect((await call('/library-poster?name=..%2Fevil.mp4', 'POST', jpeg, { 'content-type': 'image/jpeg', ...admin })).status).toBe(404)
})
