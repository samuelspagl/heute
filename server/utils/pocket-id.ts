import type { Database } from 'bun:sqlite'
import type { H3Event } from 'h3'
import type { PocketIdApp } from '~~/shared/dashboard'
import selfhstIndex from '~~/shared/selfhst-index.json'
import { normalizeShortcutUrl, parseShortcut } from '~~/shared/shortcut-input'

type ImportApp = Omit<PocketIdApp, 'status'>

function iconNameKey(name: string) {
  return name.normalize('NFD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

const iconsByName = new Map<string, string | null>()
for (const [slug, name] of selfhstIndex) {
  if (!slug || !name) continue
  const icon = 'selfhst:' + slug
  for (const value of [slug, name]) {
    const key = iconNameKey(value)
    if (!key) continue
    if (!iconsByName.has(key)) iconsByName.set(key, icon)
    else if (iconsByName.get(key) !== icon) iconsByName.set(key, null)
  }
}

interface PocketIdClient {
  id: string
  name: string
  launchURL?: string
}

interface PocketIdPage {
  data: PocketIdClient[]
  pagination: { totalPages: number }
}

export async function requirePocketIdImport(event: H3Event) {
  const user = await requireMember(event)
  if (!user.admin || isDemo(event)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin permission required' })
  }
  const { oidcIssuer, pocketIdApiKey } = useRuntimeConfig(event)
  const issuer = URL.canParse(oidcIssuer) ? new URL(oidcIssuer) : null
  if (!pocketIdApiKey.trim() || issuer?.protocol !== 'https:' || issuer.username || issuer.password) {
    throw createError({ statusCode: 503, statusMessage: 'Pocket ID import configuration required' })
  }
  return { endpoint: new URL('/api/oidc/clients', issuer), apiKey: pocketIdApiKey.trim() }
}

export async function listPocketIdApps({ endpoint, apiKey }: Awaited<ReturnType<typeof requirePocketIdImport>>) {
  const apps = new Map<string, ImportApp>()
  const signal = AbortSignal.timeout(10_000)
  let totalPages = 1
  try {
    for (let page = 1; page <= totalPages; page++) {
      const result = await $fetch<PocketIdPage>(endpoint.href, {
        headers: { 'X-API-KEY': apiKey },
        query: { 'pagination[page]': page, 'pagination[limit]': 100 },
        redirect: 'error',
        retry: 0,
        signal
      })
      if (!Array.isArray(result?.data) || !Number.isInteger(result.pagination?.totalPages) ||
          result.pagination.totalPages < 0 || (result.data.length === 0 && page < result.pagination.totalPages)) {
        throw new Error('Invalid Pocket ID response')
      }
      totalPages = result.pagination.totalPages
      for (const client of result.data) {
        if (typeof client?.id !== 'string' || !client.id || typeof client.name !== 'string') {
          throw new Error('Invalid Pocket ID client')
        }
        const url = normalizeShortcutUrl(client.launchURL)
        const name = client.name.trim()
        apps.set(client.id, {
          id: client.id,
          name,
          url: url && url.length <= 2048 ? url : null,
          icon: iconsByName.get(iconNameKey(name)) ?? 'link'
        })
      }
    }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Could not load Pocket ID apps' })
  }
  return apps
}

export function pocketIdShortcut(app: ImportApp) {
  return parseShortcut({ title: app.name, url: app.url ?? '', icon: app.icon, color: 'blue', position: 0 }).link
}

export function familyShortcutUrls(connection: Database) {
  const rows = connection.query<{ url: string }, []>("SELECT url FROM links WHERE owner = ''").all()
  return new Set(rows.map(row => normalizeShortcutUrl(row.url)))
}
