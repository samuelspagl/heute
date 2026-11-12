import type { H3Event } from 'h3'

export function normalizeCloudBase(value: string) {
  const url = URL.canParse(value) ? new URL(value) : null
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    return null
  }
  url.pathname = url.pathname.replace(/\/*$/, '/')
  return url
}

export function cloudBase(event: H3Event) {
  const base = normalizeCloudBase(useRuntimeConfig(event).nextcloudUrl)
  if (!base) throw createError({ statusCode: 503, statusMessage: 'Nextcloud HTTPS URL required' })
  return base
}

export function cloudUrl(value: string, base: URL) {
  const url = new URL(value, base)
  if (url.protocol !== base.protocol || url.origin !== base.origin || url.username || url.password) {
    throw createError({ statusCode: 502, statusMessage: 'Unexpected Nextcloud URL' })
  }
  return url
}

export function clearLegacyCloudCookie(event: H3Event) {
  if (getCookie(event, 'heute-cloud')) {
    deleteCookie(event, 'heute-cloud', { path: '/', httpOnly: true, secure: appOrigin(event).startsWith('https:') })
  }
}

export function cloudFlow(event: H3Event) {
  return useSession<{ owner: string, baseUrl: string, endpoint: string, token: string }>(event,
    privateCookie(event, 'heute-cloud-flow', 1200))
}

export const cloudFetch = { redirect: 'error' as const, timeout: 8000, retry: 0 }
