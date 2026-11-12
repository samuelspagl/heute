import selfhstIndex from './selfhst-index.json'
import { colors, icons, type Shortcut } from './dashboard'

const selfhstIcons = new Set(selfhstIndex.map(([slug]) => 'selfhst:' + slug))

export function normalizeShortcutUrl(value: unknown) {
  const rawUrl = typeof value === 'string' ? value.trim() : ''
  const url = rawUrl.length <= 2048 && URL.canParse(rawUrl) ? new URL(rawUrl) : null
  if (!url || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
  return url.href
}

export function parseShortcut(input: Partial<Shortcut> | undefined) {
  const title = typeof input?.title === 'string' ? input.title.trim() : ''
  const rawUrl = typeof input?.url === 'string' ? input.url.trim() : ''
  const icon = input?.icon
  const validIcon = typeof icon === 'string' && (icons.some(value => value === icon) || selfhstIcons.has(icon))
  const color = colors.find(value => value === input?.color)
  const position = input?.position
  if (!title || title.length > 60 || rawUrl.length > 2048 || !validIcon || !color ||
      typeof position !== 'number' || !Number.isInteger(position) || position < 0 || position > 9999) {
    return { error: 'Invalid link data' } as const
  }
  const url = normalizeShortcutUrl(rawUrl)
  if (!url) {
    return { error: 'Invalid URL' } as const
  }
  return { link: { title, url, icon, color, position } }
}
