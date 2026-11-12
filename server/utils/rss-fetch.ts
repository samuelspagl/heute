import type { RssEntry } from '~~/shared/rss'
import { parseFeed } from './rss-parser'

const maxBytes = 1024 * 1024
const cache = new Map<string, { until: number, entries: RssEntry[] }>()
const pending = new Map<string, Promise<RssEntry[]>>()

async function fetchFeed(url: string): Promise<RssEntry[]> {
  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(4500),
    headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1' }
  })
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel()
    throw new Error('Feed response rejected')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let length = 0
  let xml = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBytes) {
        await reader.cancel()
        throw new Error('Feed exceeds size limit')
      }
      xml += decoder.decode(value, { stream: true })
    }
    return parseFeed(xml + decoder.decode(), url)
  } finally {
    reader.releaseLock()
  }
}

export function getRssEntries(url: string): Promise<RssEntry[]> {
  const cached = cache.get(url)
  if (cached && cached.until > Date.now()) return Promise.resolve(cached.entries)
  const active = pending.get(url)
  if (active) return active

  const request = fetchFeed(url).then(entries => {
    cache.set(url, { until: Date.now() + 10 * 60_000, entries })
    return entries
  }).finally(() => pending.delete(url))
  pending.set(url, request)
  return request
}
