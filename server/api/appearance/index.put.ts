import { mediaDirectories, openMedia } from '../../utils/media/storage'
import { appearanceSizes, defaultAppearance, isOverlayOpacity, isWallpaperPreset, type Appearance, type AppearanceSizeKey } from '~~/shared/appearance'

type AppearanceOptions = Pick<Appearance, AppearanceSizeKey | 'overlayOpacity'>

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const body = await readBody<Partial<Record<'wallpaper' | keyof AppearanceOptions, unknown>>>(event)
  const wallpaper = body?.wallpaper
  const overlayOpacity = body?.overlayOpacity
  if (overlayOpacity !== undefined && !isOverlayOpacity(overlayOpacity)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid overlay opacity' })
  }
  const connection = db(event)
  if (body && wallpaper === undefined) {
    if ((Object.keys(appearanceSizes) as AppearanceSizeKey[]).some(key =>
      body[key] !== undefined && !appearanceSizes[key].some(size => size === body[key])
    )) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid appearance size' })
    }
    const { iconSize = null, labelSize = null, widgetWidth = null } = body as Partial<AppearanceOptions>
    if (iconSize === null && labelSize === null && widgetWidth === null && overlayOpacity === undefined) {
      throw createError({ statusCode: 400, statusMessage: 'Missing appearance options' })
    }
    connection.query(`
      INSERT INTO appearance (owner, wallpaper, icon_size, label_size, widget_width, overlay_opacity)
      VALUES (?, ?, COALESCE(?, ?), COALESCE(?, ?), COALESCE(?, ?), COALESCE(?, ?))
      ON CONFLICT (owner) DO UPDATE SET
      icon_size = COALESCE(?, appearance.icon_size),
      label_size = COALESCE(?, appearance.label_size),
      widget_width = COALESCE(?, appearance.widget_width),
      overlay_opacity = COALESCE(?, appearance.overlay_opacity)
    `).run(user.id, defaultAppearance.wallpaper, iconSize, defaultAppearance.iconSize,
      labelSize, defaultAppearance.labelSize, widgetWidth, defaultAppearance.widgetWidth,
      overlayOpacity ?? null, defaultAppearance.overlayOpacity, iconSize, labelSize, widgetWidth, overlayOpacity ?? null)
  } else if (wallpaper === 'custom') {
    const result = connection.query(`
      UPDATE appearance SET wallpaper = 'custom', overlay_opacity = COALESCE(?, overlay_opacity)
      WHERE owner = ? AND media_file IS NOT NULL
    `).run(overlayOpacity ?? null, user.id)
    if (!result.changes) throw createError({ statusCode: 404, statusMessage: 'Wallpaper image not found' })
  } else if (typeof wallpaper === 'string' && wallpaper.startsWith('library:')) {
    const media = await openMedia(mediaDirectories(useRuntimeConfig(event).databasePath).library, wallpaper.slice(8)).catch(() => null)
    if (!media) throw createError({ statusCode: 404, statusMessage: 'Library wallpaper not found' })
    await media.file.close()
    connection.query(`
      INSERT INTO appearance (owner, wallpaper, overlay_opacity) VALUES (?, ?, COALESCE(?, ?))
      ON CONFLICT (owner) DO UPDATE SET wallpaper = excluded.wallpaper, overlay_opacity = COALESCE(?, appearance.overlay_opacity)
    `).run(user.id, wallpaper, overlayOpacity ?? null, defaultAppearance.overlayOpacity, overlayOpacity ?? null)
  } else if (isWallpaperPreset(wallpaper)) {
    connection.query(`
      INSERT INTO appearance (owner, wallpaper, overlay_opacity) VALUES (?, ?, COALESCE(?, ?))
      ON CONFLICT (owner) DO UPDATE SET
      wallpaper = excluded.wallpaper, overlay_opacity = COALESCE(?, appearance.overlay_opacity)
    `).run(user.id, wallpaper, overlayOpacity ?? null, defaultAppearance.overlayOpacity, overlayOpacity ?? null)
  } else {
    throw createError({ statusCode: 400, statusMessage: 'Invalid wallpaper' })
  }
  return getAppearance(connection, user.id)
})
