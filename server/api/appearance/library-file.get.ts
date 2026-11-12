import { mediaDirectories, mediaMime } from '../../utils/media/storage'
import { serveMedia } from '../../utils/media/serve'
export default defineEventHandler(async (event) => {
  await requireMember(event)
  const name = getQuery(event).name
  const type = typeof name === 'string' ? mediaMime(name) : null
  if (typeof name !== 'string' || !type) throw createError({ statusCode: 404 })
  return serveMedia(event, mediaDirectories(useRuntimeConfig(event).databasePath).library, name, type)
})
