import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createApp, defineEventHandler, toWebHandler } from 'h3'
import { byteRange, initializeMedia, isVideoHeader, listMedia, mediaDirectories, mediaMime, openMedia, posterFileName, sanitizeLibraryName } from '../../server/utils/media/storage'
import { serveMedia } from '../../server/utils/media/serve'

const roots: string[] = []
const connections: Database[] = []
afterEach(() => {
  for (const db of connections.splice(0)) db.close()
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'heute-media-'))
  roots.push(root)
  const path = join(root, 'heute.sqlite')
  const db = new Database(path)
  connections.push(db)
  db.exec('CREATE TABLE appearance (owner TEXT PRIMARY KEY, wallpaper TEXT, image BLOB, image_version TEXT)')
  return { root, path, db, dirs: mediaDirectories(path) }
}

describe('media files and migration', () => {
  test('migrates legacy images, clears BLOBs only after writing and is repeatable', () => {
    const { path, db, dirs } = setup()
    db.query("INSERT INTO appearance VALUES (?, 'custom', ?, 'old')").run('alice', Buffer.from('legacy-webp'))
    initializeMedia(db, path)
    const row = db.query<{ image: null, media_file: string, media_type: string, image_version: string, wallpaper: string }, []>('SELECT * FROM appearance').get()!
    expect(readFileSync(join(dirs.uploads, row.media_file)).toString()).toBe('legacy-webp')
    expect(row.image).toBeNull()
    expect(row.media_type).toBe('image/webp')
    expect(row.wallpaper).toBe('custom')
    expect(row.image_version).not.toBe('old')
    initializeMedia(db, path)
    expect(db.query('SELECT media_file FROM appearance').get()).toEqual({ media_file: row.media_file })
  })
  test('failed filesystem migration preserves the legacy BLOB', () => {
    const { root, path, db } = setup()
    db.query("INSERT INTO appearance VALUES ('alice', 'custom', ?, 'old')").run(Buffer.from('keep-me'))
    writeFileSync(join(root, 'media'), 'not a directory')
    expect(() => initializeMedia(db, path)).toThrow()
    const row = db.query<{ image: Uint8Array }, []>('SELECT image FROM appearance').get()!
    expect(Buffer.from(row.image).toString()).toBe('keep-me')
  })
  test('library lists regular supported files, excluding links and hidden files', async () => {
    const { path, db, dirs } = setup()
    initializeMedia(db, path)
    writeFileSync(join(dirs.library, 'Forest.mp4'), 'video')
    writeFileSync(join(dirs.library, 'Rose.webp'), 'image')
    writeFileSync(join(dirs.library, '.secret.png'), 'private')
    writeFileSync(join(dirs.library, 'script.svg'), '<svg/>')
    writeFileSync(join(dirs.posters, 'Forest.jpg'), 'poster')
    symlinkSync(join(dirs.library, 'Rose.webp'), join(dirs.library, 'link.webp'))
    const listed = await listMedia(dirs.library, dirs.posters)
    expect(listed.map(x => x.id)).toEqual(['library:Forest.mp4', 'library:Rose.webp'])
    expect(listed.find(x => x.id === 'library:Forest.mp4')?.poster).toBe(true)
    expect(listed.find(x => x.id === 'library:Rose.webp')?.poster).toBe(false)
    await expect(openMedia(dirs.library, 'link.webp')).rejects.toThrow()
    await expect(openMedia(dirs.library, '../Rose.webp')).rejects.toThrow()
    expect(mediaMime('file.constructor')).toBeNull()
    expect(mediaMime('a\\b.mp4')).toBeNull()
  })
  test('sanitizes library names to safe file names', () => {
    expect(sanitizeLibraryName('Forest.jpg', 'webp')).toBe('Forest.webp')
    expect(sanitizeLibraryName('../secret.png', 'webp')).toBe('Hintergrund.webp')
    expect(sanitizeLibraryName('..', 'mp4')).toBe('Hintergrund.mp4')
    expect(sanitizeLibraryName('  Mein  Urlaub  ', 'webp')).toBe('Mein Urlaub.webp')
    expect(sanitizeLibraryName('a/b\\c.mp4', 'mp4')).toBe('a b c.mp4')
    expect(sanitizeLibraryName('x.unknown', 'webp')).toBe('x.webp')
  })
  test('derives poster file names', () => {
    expect(posterFileName('forest.mp4')).toBe('forest.jpg')
    expect(posterFileName('clip.webm')).toBe('clip.jpg')
    expect(posterFileName('a.b.c.mp4')).toBe('a.b.c.jpg')
  })
})

describe('video delivery', () => {
  test('ranges support closed, open and suffix requests; invalid ranges fail', () => {
    expect(byteRange('bytes=2-5', 10)).toEqual({ start: 2, end: 5 })
    expect(byteRange('bytes=2-', 10)).toEqual({ start: 2, end: 9 })
    expect(byteRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 })
    expect(byteRange('bytes=2-99', 10)).toEqual({ start: 2, end: 9 })
    for (const header of ['bytes=99-', 'bytes=-0', 'bytes=4-2', 'bytes=-', 'bytes=0-1,3-4']) expect(() => byteRange(header, 10)).toThrow()
  })
  test('streams exact bytes and reports HTTP 206/416 with range headers', async () => {
    const { path, db, dirs } = setup()
    initializeMedia(db, path)
    writeFileSync(join(dirs.library, 'video.mp4'), '0123456789')
    const app = createApp()
    app.use(defineEventHandler(event => serveMedia(event, dirs.library, 'video.mp4', 'video/mp4')))
    const request = toWebHandler(app)
    const partial = await request(new Request('http://localhost/video', { headers: { range: 'bytes=2-5' } }))
    expect(partial.status).toBe(206)
    expect(partial.headers.get('content-range')).toBe('bytes 2-5/10')
    expect(await partial.text()).toBe('2345')
    const full = await request(new Request('http://localhost/video'))
    expect(full.headers.get('cache-control')).toBe('private, no-store')
    expect(await full.text()).toBe('0123456789')
    const invalid = await request(new Request('http://localhost/video', { headers: { range: 'bytes=20-' } }))
    expect(invalid.status).toBe(416)
    expect(invalid.headers.get('content-range')).toBe('bytes */10')
  })
  test('rejects arbitrary bytes disguised as video containers', () => {
    expect(isVideoHeader(Buffer.from('not a video'), 'video/mp4')).toBe(false)
    expect(isVideoHeader(Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50]), 'video/mp4')).toBe(true)
    expect(isVideoHeader(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), 'video/webm')).toBe(true)
  })
})
