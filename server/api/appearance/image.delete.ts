import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { mediaDirectories, posterFileName } from '../../utils/media/storage'
import { defaultAppearance } from '~~/shared/appearance'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const connection = db(event)
  const previous = connection.query<{ media_file: string | null }, [string]>('SELECT media_file FROM appearance WHERE owner = ?').get(user.id)
  connection.query(`
    UPDATE appearance SET image = NULL, image_version = NULL, media_file = NULL, media_type = NULL,
    wallpaper = CASE WHEN wallpaper = 'custom' THEN ? ELSE wallpaper END
    WHERE owner = ?
  `).run(defaultAppearance.wallpaper, user.id)
  if (previous?.media_file) {
    const directory = mediaDirectories(useRuntimeConfig(event).databasePath).uploads
    await unlink(join(directory, previous.media_file)).catch(() => {})
    await unlink(join(directory, posterFileName(previous.media_file))).catch(() => {})
  }
  return getAppearance(connection, user.id)
})
