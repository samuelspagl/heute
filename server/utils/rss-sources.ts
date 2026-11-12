import type { H3Event } from 'h3'

// Keep account context at the source boundary for future personal feeds.
export function resolveRssSources(event: H3Event, _accountId: string): string[] {
  let configured: unknown = useRuntimeConfig(event).rssFeeds
  if (typeof configured === 'string') {
    try {
      configured = JSON.parse(configured)
    } catch {
      return []
    }
  }
  if (!Array.isArray(configured)) return []

  const urls = new Set<string>()
  for (const value of configured) {
    if (typeof value !== 'string') continue
    try {
      const url = new URL(value)
      if (url.protocol !== 'https:' || url.username || url.password) continue
      url.hash = ''
      urls.add(url.href)
      if (urls.size === 10) break
    } catch {
      continue
    }
  }
  return [...urls]
}
