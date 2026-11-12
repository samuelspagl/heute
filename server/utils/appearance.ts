import type { Database } from 'bun:sqlite'
import { defaultAppearance, isWallpaperPreset, type Appearance } from '~~/shared/appearance'

export function getAppearance(connection: Database, owner: string): Appearance {
  const appearance = connection.query<Appearance, [string]>(
    `SELECT wallpaper, image_version AS imageVersion, media_type AS mediaType, icon_size AS iconSize,
      label_size AS labelSize, widget_width AS widgetWidth, overlay_opacity AS overlayOpacity
      FROM appearance WHERE owner = ?`
  ).get(owner) ?? defaultAppearance
  // Retired bundled media must not leave existing accounts with a missing background.
  return appearance.wallpaper === 'custom' || appearance.wallpaper.startsWith('library:') || isWallpaperPreset(appearance.wallpaper)
    ? appearance
    : { ...appearance, wallpaper: defaultAppearance.wallpaper }
}
