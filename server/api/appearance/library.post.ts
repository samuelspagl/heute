import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { wallpaperVideoTypes } from '~~/shared/appearance'
import { mediaDirectories, posterFileName, sanitizeLibraryName } from '../../utils/media/storage'
import { receiveMedia } from '../../utils/media/receive'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  if (!user.admin) throw createError({ statusCode: 403, statusMessage: 'Admin permission required' })
  const rawName = getQuery(event).name
  if (typeof rawName !== 'string' || !rawName.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Library name required' })
  }
  const contentType = getHeader(event, 'content-type') ?? ''
  const video = wallpaperVideoTypes.some(type => type === contentType)
  const extension = video ? contentType.split('/')[1] ?? 'mp4' : 'webp'
  const name = sanitizeLibraryName(rawName, extension)
  db(event)
  const dirs = mediaDirectories(useRuntimeConfig(event).databasePath)
  const received = await receiveMedia(event, dirs.library, name)
  if (!received.type.startsWith('video/')) {
    await unlink(join(dirs.posters, posterFileName(name))).catch(() => {})
  }
  return { id: `library:${name}`, label: name.replace(/\.[^.]+$/, '') }
})
