import { mediaDirectories, posterFileName } from '../../utils/media/storage'
import { receivePoster } from '../../utils/media/receive'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const saved = db(event).query<{ media_file: string, media_type: string }, [string]>(
    'SELECT media_file, media_type FROM appearance WHERE owner = ? AND media_file IS NOT NULL'
  ).get(user.id)
  if (!saved || !saved.media_type.startsWith('video/')) throw createError({ statusCode: 404, statusMessage: 'Wallpaper video not found' })
  await receivePoster(event, mediaDirectories(useRuntimeConfig(event).databasePath).uploads, posterFileName(saved.media_file))
  return { ok: true }
})
