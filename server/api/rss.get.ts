import type { RssResult } from '~~/shared/rss'

export default defineEventHandler(async (event): Promise<RssResult> => {
  if (isDemo(event)) return {
    failed: false,
    entries: [
      { title: 'Neue Ideen für die Familienstartseite', summary: 'Eine Auswahl kleiner Verbesserungen für den gemeinsamen Alltag.', url: 'https://example.org/neuigkeiten', publishedAt: null },
      { title: 'Ein Wochenende im Grünen', summary: 'Drei Ausflugsideen für die ganze Familie und für jedes Wetter.', url: 'https://example.org/ausfluege', publishedAt: null }
    ]
  }

  const user = await requireMember(event)
  const sources = resolveRssSources(event, user.id)
  const feeds = await Promise.allSettled(sources.map(getRssEntries))
  const ordered = feeds.flatMap(feed => feed.status === 'fulfilled' ? feed.value : [])
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))

  const seen = new Set<string>()
  const entries = ordered.filter(entry => {
    if (seen.has(entry.url)) return false
    seen.add(entry.url)
    return true
  }).slice(0, 3)
  return { entries, failed: feeds.length > 0 && feeds.every(feed => feed.status === 'rejected') }
})
