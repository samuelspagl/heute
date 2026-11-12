import { listMedia, mediaDirectories } from '../../utils/media/storage'
export default defineEventHandler(async (event) => {
  await requireMember(event)
  db(event)
  const dirs = mediaDirectories(useRuntimeConfig(event).databasePath)
  return listMedia(dirs.library, dirs.posters)
})
