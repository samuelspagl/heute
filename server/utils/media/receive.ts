import sharp from 'sharp'
import { createError, getHeader, getRequestWebStream, type H3Event } from 'h3'
import { open, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { maxWallpaperBytes, maxWallpaperVideoBytes, wallpaperImageTypes, wallpaperVideoTypes } from '~~/shared/appearance'
import { isVideoHeader } from './storage'

export const maxPosterBytes = 1024 * 1024

export async function receiveMedia(event: H3Event, directory: string, name: string) {
  const contentType = getHeader(event, 'content-type') ?? ''
  const video = wallpaperVideoTypes.some(type => type === contentType)
  if (!video && !wallpaperImageTypes.some(type => type === contentType)) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported wallpaper type' })
  }
  const limit = video ? maxWallpaperVideoBytes : maxWallpaperBytes
  const tooLarge = () => createError({ statusCode: 413, statusMessage: video ? 'Video exceeds 64 MiB' : 'Image exceeds 8 MiB' })
  if (Number(getHeader(event, 'content-length')) > limit) throw tooLarge()
  const type = video ? contentType : 'image/webp'
  const destination = join(directory, name)
  const temporary = join(directory, `${name}.tmp`)
  const reader = getRequestWebStream(event)?.getReader()
  if (!reader) throw createError({ statusCode: 400, statusMessage: 'Missing wallpaper' })
  let committed = false
  try {
    const file = await open(temporary, 'wx', 0o600)
    try {
      let bytes = 0
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > limit) { await reader.cancel(); throw tooLarge() }
        await file.writeFile(value)
      }
      if (!bytes) throw createError({ statusCode: 422, statusMessage: 'Empty wallpaper' })
      if (video) {
        // A read-only handle is needed because the upload handle is write-only.
        const source = await open(temporary, 'r')
        try {
          const header = Buffer.alloc(12)
          const { bytesRead } = await source.read(header, 0, header.length, 0)
          if (!isVideoHeader(header.subarray(0, bytesRead), contentType)) {
            throw createError({ statusCode: 422, statusMessage: 'Invalid video container' })
          }
        } finally { await source.close() }
      }
      await file.sync()
    } finally { await file.close() }
    if (video) {
      await rename(temporary, destination)
    } else {
      let image: Buffer
      try {
        const decoder = sharp(temporary, { limitInputPixels: 24_000_000, failOn: 'warning' })
        const { format, width, height, pages } = await decoder.metadata()
        if (!format || !['jpeg', 'png', 'webp'].includes(format) || !width || !height || width * height > 24_000_000 || (pages ?? 1) > 1) throw new Error('Unsupported image')
        image = await decoder.rotate().resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()
      } catch { throw createError({ statusCode: 422, statusMessage: 'Invalid image or exceeds 24 megapixels' }) }
      await writeFile(temporary, image, { mode: 0o600, flush: true })
      await rename(temporary, destination)
    }
    committed = true
    return { name, type }
  } finally {
    reader.releaseLock()
    await unlink(temporary).catch(() => {})
    if (!committed) await unlink(destination).catch(() => {})
  }
}

export async function receivePoster(event: H3Event, directory: string, name: string) {
  const contentType = getHeader(event, 'content-type') ?? ''
  if (contentType !== 'image/jpeg') throw createError({ statusCode: 415, statusMessage: 'Unsupported poster type' })
  if (Number(getHeader(event, 'content-length')) > maxPosterBytes) throw createError({ statusCode: 413, statusMessage: 'Poster exceeds 1 MiB' })
  const destination = join(directory, name)
  const temporary = join(directory, `${name}.tmp`)
  const reader = getRequestWebStream(event)?.getReader()
  if (!reader) throw createError({ statusCode: 400, statusMessage: 'Missing poster' })
  let committed = false
  try {
    const file = await open(temporary, 'wx', 0o600)
    try {
      let bytes = 0
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > maxPosterBytes) { await reader.cancel(); throw createError({ statusCode: 413, statusMessage: 'Poster exceeds 1 MiB' }) }
        await file.writeFile(value)
      }
      if (!bytes) throw createError({ statusCode: 422, statusMessage: 'Empty poster' })
      await file.sync()
    } finally { await file.close() }
    await rename(temporary, destination)
    committed = true
  } finally {
    reader.releaseLock()
    await unlink(temporary).catch(() => {})
    if (!committed) await unlink(destination).catch(() => {})
  }
}
