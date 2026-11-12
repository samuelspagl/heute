interface Entry {
  title: string
  subline?: string
  resourceUrl: string
  icon?: string
}

interface SearchPage {
  ocs?: { data?: { entries?: Entry[], cursor?: number | string | null } }
}

export default defineEventHandler(async (event) => {
  const user = await requireMember(event)
  clearLegacyCloudCookie(event)
  const base = cloudBase(event)
  const key = cloudEncryptionKey(event)
  const connection = findCloudConnection(db(event), user.id, base.href, key)
  if (!connection) return { connected: false, files: [], limited: false }

  const { q } = getQuery(event)
  if (typeof q !== 'string' || q.trim().length < 2 || q.length > 120) {
    return { connected: true, files: [], limited: false }
  }

  const query = q.trim()
  const filter = /^\.([a-z0-9]+)(?:\s+(.*))?$/is.exec(query)
  const extension = filter?.[1]?.toLowerCase()
  const term = filter?.[2]?.trim() || (extension ? '.' + extension : query)
  const url = new URL('ocs/v2.php/search/providers/files/search', base)
  const pageSize = extension ? 24 : 8
  const pageLimit = extension ? 3 : 1
  const headers = cloudHeaders(connection)
  const files: { title: string, detail: string, url: string }[] = []
  const seen = new Set<string>()
  let cursor: string | undefined
  let limited = false

  for (let page = 0; page < pageLimit; page++) {
    url.search = new URLSearchParams({ term, limit: String(pageSize), format: 'json' }).toString()
    if (cursor) url.searchParams.set('cursor', cursor)
    const response = await $fetch.raw<SearchPage>(url.href, {
      ...cloudFetch, ignoreResponseError: true, headers
    }).catch(() => { throw createError({ statusCode: 502, statusMessage: 'Nextcloud search failed' }) })

    if (response.status === 401 || response.status === 403) return { connected: false, files: [], limited: false }
    const data = response._data?.ocs?.data
    if (!response.ok || !Array.isArray(data?.entries)) {
      throw createError({ statusCode: 502, statusMessage: 'Nextcloud search unavailable' })
    }

    for (const entry of data.entries.slice(0, pageSize)) {
      if (typeof entry?.title !== 'string' || typeof entry.resourceUrl !== 'string') continue
      if (extension && (entry.icon === 'icon-folder' || !entry.title.toLowerCase().endsWith('.' + extension))) continue
      try {
        const href = cloudUrl(entry.resourceUrl, base).href
        if (seen.has(href)) continue
        seen.add(href)
        files.push({ title: entry.title, detail: typeof entry.subline === 'string' ? entry.subline : '', url: href })
        if (files.length === 8) break
      } catch {
        continue
      }
    }

    const next = typeof data.cursor === 'number' || typeof data.cursor === 'string' ? String(data.cursor) : ''
    if (files.length === 8 || !extension || !data.entries.length || !next || next.length > 128 || next === cursor) break
    cursor = next
    limited = page === pageLimit - 1
  }
  return { connected: true, files, limited }
})
