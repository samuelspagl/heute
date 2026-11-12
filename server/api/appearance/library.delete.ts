import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { mediaDirectories, mediaMime, posterFileName } from '../../utils/media/storage'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  if (!user.admin) throw createError({ statusCode: 403, statusMessage: 'Admin permission required' })
  const name = getQuery(event).name
  const type = typeof name === 'string' ? mediaMime(name) : null
  if (typeof name !== 'string' || !type) throw createError({ statusCode: 404 })
  db(event)
  const dirs = mediaDirectories(useRuntimeConfig(event).databasePath)
  await unlink(join(dirs.library, name)).catch(() => {
    throw createError({ statusCode: 404, statusMessage: 'Library media not found' })
  })
  await unlink(join(dirs.posters, posterFileName(name))).catch(() => {})
  return { ok: true }
})
