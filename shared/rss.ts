export interface RssEntry {
  title: string
  summary: string
  url: string
  publishedAt: string | null
}

export interface RssResult {
  entries: RssEntry[]
  failed: boolean
}
