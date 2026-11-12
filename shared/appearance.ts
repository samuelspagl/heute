export const wallpaperPresets = [
  { id: 'rose-waves', labelKey: 'wallpaper.rose-waves' },
  { id: 'blue-waves', labelKey: 'wallpaper.blue-waves' },
  { id: 'cool', labelKey: 'wallpaper.cool' },
  { id: 'warm', labelKey: 'wallpaper.warm' },
  { id: 'blue', labelKey: 'wallpaper.blue' }
] as const

export type WallpaperPreset = typeof wallpaperPresets[number]['id']

export const appearanceSizes = {
  iconSize: [48, 56, 64],
  labelSize: [12, 14, 16],
  widgetWidth: [280, 316, 360]
} as const

export type AppearanceSizeKey = keyof typeof appearanceSizes

export interface Appearance extends Record<AppearanceSizeKey, number> {
  wallpaper: WallpaperPreset | 'custom' | `library:${string}`
  imageVersion: string | null
  mediaType?: string | null
  overlayOpacity: number
}

export const defaultAppearance: Appearance = {
  wallpaper: 'rose-waves', imageVersion: null, iconSize: 56, labelSize: 14, widgetWidth: 316, overlayOpacity: 100
}
export const maxWallpaperBytes = 8 * 1024 * 1024
export const maxWallpaperVideoBytes = 64 * 1024 * 1024
export const wallpaperVideoTypes = ['video/mp4', 'video/webm'] as const
export const wallpaperImageTypes = ['image/jpeg', 'image/png', 'image/webp'] as const

export function isWallpaperPreset(value: unknown): value is WallpaperPreset {
  return wallpaperPresets.some(preset => preset.id === value)
}

export function hasWallpaperOverlay(wallpaper: Appearance['wallpaper']) {
  return wallpaper === 'custom' || wallpaper.startsWith('library:')
}

export function isOverlayOpacity(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100
}

export function wallpaperImageUrl(version: string) {
  return '/api/appearance/image?v=' + encodeURIComponent(version)
}

export function wallpaperPosterUrl(version: string) {
  return '/api/appearance/poster?v=' + encodeURIComponent(version)
}

export interface LibraryWallpaper { id: `library:${string}`, label: string, type: string, poster: boolean }

export function libraryMediaUrl(id: string) {
  return '/api/appearance/library-file?name=' + encodeURIComponent(id.slice('library:'.length)).replaceAll("'", '%27')
}

export function libraryPosterUrl(id: string) {
  return '/api/appearance/library-poster?name=' + encodeURIComponent(id.slice('library:'.length)).replaceAll("'", '%27')
}
