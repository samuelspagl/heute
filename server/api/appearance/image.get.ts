import { mediaDirectories } from '../../utils/media/storage'
import { serveMedia } from '../../utils/media/serve'
export default defineEventHandler(async (event) => {
  const user = await requireMember(event)
  const { v: version } = getQuery(event)
  const saved = db(event).query<{ media_file: string, media_type: string, image_version: string }, [string]>(
    'SELECT media_file, media_type, image_version FROM appearance WHERE owner = ? AND media_file IS NOT NULL'
  ).get(user.id)
  if (!saved || (version !== undefined && version !== saved.image_version)) throw createError({ statusCode: 404, statusMessage: 'Wallpaper not found' })
  return serveMedia(event, mediaDirectories(useRuntimeConfig(event).databasePath).uploads, saved.media_file, saved.media_type)
})
