import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { wallpaperVideoTypes } from '~~/shared/appearance'
import { mediaDirectories, posterFileName } from '../../utils/media/storage'
import { receiveMedia } from '../../utils/media/receive'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const connection = db(event)
  const directory = mediaDirectories(useRuntimeConfig(event).databasePath).uploads
  const version = crypto.randomUUID()
  const contentType = getHeader(event, 'content-type') ?? ''
  const video = wallpaperVideoTypes.some(type => type === contentType)
  const name = `${version}.${video ? contentType.split('/')[1] : 'webp'}`
  const received = await receiveMedia(event, directory, name)
  const previous = connection.query<{ media_file: string | null }, [string]>('SELECT media_file FROM appearance WHERE owner = ?').get(user.id)
  connection.query(`
    INSERT INTO appearance (owner, wallpaper, image_version, media_file, media_type) VALUES (?, 'custom', ?, ?, ?)
    ON CONFLICT (owner) DO UPDATE SET wallpaper = 'custom', image = NULL,
      image_version = excluded.image_version, media_file = excluded.media_file, media_type = excluded.media_type
  `).run(user.id, version, name, received.type)
  if (previous?.media_file) {
    await unlink(join(directory, previous.media_file)).catch(() => {})
    await unlink(join(directory, posterFileName(previous.media_file))).catch(() => {})
  }
  return getAppearance(connection, user.id)
})
