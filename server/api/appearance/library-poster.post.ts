import { mediaDirectories, mediaMime, openMedia, posterFileName } from '../../utils/media/storage'
import { receivePoster } from '../../utils/media/receive'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  if (!user.admin) throw createError({ statusCode: 403, statusMessage: 'Admin permission required' })
  const name = getQuery(event).name
  const type = typeof name === 'string' ? mediaMime(name) : null
  if (typeof name !== 'string' || !type || !type.startsWith('video/')) throw createError({ statusCode: 404 })
  const dirs = mediaDirectories(useRuntimeConfig(event).databasePath)
  const media = await openMedia(dirs.library, name).catch(() => null)
  if (!media) throw createError({ statusCode: 404, statusMessage: 'Library video not found' })
  await media.file.close()
  db(event)
  await receivePoster(event, dirs.posters, posterFileName(name))
  return { ok: true }
})
