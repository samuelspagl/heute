import { createHash } from 'node:crypto'

export interface HaConfig {
  baseUrl: string
  token: string
  calendarIds: string[]
  requestTimeoutMs: number
  cacheTtlSeconds: number
  timezone: string
  generation: string
}

export interface HaRawConfig {
  haUrl: string
  haToken: string
  haCalendarIds: string
  haRequestTimeoutMs: number | string
  haCacheTtlSeconds: number | string
  haCalendarTimezone: string
}

export type HaConfigResult =
  | { enabled: true; config: HaConfig }
  | { enabled: false }

export class HaConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HaConfigError'
  }
}

export const CALENDAR_ID_PATTERN = /^calendar\.[a-z0-9_]+$/
const MAX_CALENDARS = 20
const MIN_TIMEOUT_MS = 1000
const MAX_TIMEOUT_MS = 30_000
const MIN_TTL_SECONDS = 30
const MAX_TTL_SECONDS = 300

function normalizeBaseUrl(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  if (url.search || url.hash) return null
  return url.href.replace(/\/+$/, '') || url.origin
}

function parseCalendarIds(value: string): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  for (const raw of value.split(',')) {
    const id = raw.trim()
    if (!id) continue
    if (!CALENDAR_ID_PATTERN.test(id)) throw new HaConfigError(`Invalid calendar id: ${id}`)
    if (seen.has(id)) continue
    seen.add(id)
    ids.push(id)
    if (ids.length > MAX_CALENDARS) throw new HaConfigError('Too many calendars')
  }
  return ids
}

function parseInteger(value: number | string, min: number, max: number, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new HaConfigError(`Invalid ${label}: ${value}`)
  }
  return parsed
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function parseHaConfig(raw: HaRawConfig): HaConfigResult {
  const url = String(raw.haUrl ?? '').trim()
  const token = String(raw.haToken ?? '').trim()
  const calendarIdsRaw = String(raw.haCalendarIds ?? '').trim()

  if (!url && !token && !calendarIdsRaw) return { enabled: false }

  if (!url) throw new HaConfigError('HA base URL required')
  if (!token) throw new HaConfigError('HA token required')

  const baseUrl = normalizeBaseUrl(url)
  if (!baseUrl) throw new HaConfigError('Invalid HA base URL')

  const calendarIds = parseCalendarIds(calendarIdsRaw)

  const requestTimeoutMs = parseInteger(raw.haRequestTimeoutMs, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS, 'request timeout')
  const cacheTtlSeconds = parseInteger(raw.haCacheTtlSeconds, MIN_TTL_SECONDS, MAX_TTL_SECONDS, 'cache TTL')

  const timezone = String(raw.haCalendarTimezone ?? '').trim() || 'Europe/Berlin'
  if (!isValidTimeZone(timezone)) throw new HaConfigError('Invalid HA calendar timezone')

  const generation = createHash('sha256')
    .update([baseUrl, token, calendarIds.join(','), timezone].join('\n'))
    .digest('hex')
    .slice(0, 24)

  return {
    enabled: true,
    config: { baseUrl, token, calendarIds, requestTimeoutMs, cacheTtlSeconds, timezone, generation }
  }
}

export type HaErrorKind = 'timeout' | 'network' | 'redirect' | 'http' | 'size_limit' | 'invalid_response'

export class HaHttpError extends Error {
  constructor(
    public readonly kind: HaErrorKind,
    public readonly label: string,
    public readonly httpStatus?: number
  ) {
    super(kind)
    this.name = 'HaHttpError'
  }
}

export class OverloadError extends Error {
  constructor() {
    super('overload')
    this.name = 'OverloadError'
  }
}

export function isStaleEligible(error: unknown): boolean {
  if (error instanceof HaHttpError) {
    if (error.kind === 'timeout' || error.kind === 'network') return true
    if (error.kind === 'http') return (error.httpStatus ?? 0) >= 500
  }
  return false
}

export function isTimeout(error: unknown): boolean {
  return error instanceof HaHttpError && error.kind === 'timeout'
}

export type FetchImpl = (input: string | URL, init?: RequestInit) => Promise<Response>

const MAX_CALENDAR_BYTES = 2 * 1024 * 1024
const MAX_STATES_BYTES = 8 * 1024 * 1024

function classifyRejection(error: unknown): 'timeout' | 'network' {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return 'timeout'
  return 'network'
}

async function requestJson(
  fetchImpl: FetchImpl,
  config: HaConfig,
  url: URL,
  maxBytes: number,
  label: string,
  log: (message: string) => void
): Promise<unknown> {
  const startedAt = Date.now()

  let response: Response
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(config.requestTimeoutMs),
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${config.token}`
      }
    })
  } catch (error) {
    const kind = classifyRejection(error)
    log(`calendar upstream error code=${kind} label=${label} duration=${Date.now() - startedAt}`)
    throw new HaHttpError(kind, label)
  }

  const duration = Date.now() - startedAt
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel().catch(() => {})
    log(`calendar upstream redirect label=${label} status=${response.status}`)
    throw new HaHttpError('redirect', label, response.status)
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => {})
    log(`calendar upstream http label=${label} status=${response.status} duration=${duration}`)
    throw new HaHttpError('http', label, response.status)
  }

  const lengthHeader = Number(response.headers.get('content-length'))
  if (Number.isFinite(lengthHeader) && lengthHeader > maxBytes) {
    await response.body?.cancel().catch(() => {})
    log(`calendar upstream size label=${label}`)
    throw new HaHttpError('size_limit', label, response.status)
  }

  if (!response.body) {
    throw new HaHttpError('invalid_response', label, response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => {})
        log(`calendar upstream size label=${label}`)
        throw new HaHttpError('size_limit', label, response.status)
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } catch (error) {
    if (error instanceof HaHttpError) throw error
    const kind = classifyRejection(error)
    log(`calendar upstream read error code=${kind} label=${label} duration=${Date.now() - startedAt}`)
    throw new HaHttpError(kind, label, response.status)
  } finally {
    reader.releaseLock()
  }

  try {
    return JSON.parse(text)
  } catch {
    log(`calendar upstream invalid json label=${label}`)
    throw new HaHttpError('invalid_response', label, response.status)
  }
}

export function fetchCalendarRaw(
  fetchImpl: FetchImpl,
  config: HaConfig,
  calendarId: string,
  start: string,
  end: string,
  log: (message: string) => void
): Promise<unknown> {
  const url = new URL(`${config.baseUrl}/api/calendars/${encodeURIComponent(calendarId)}`)
  url.searchParams.set('start', start)
  url.searchParams.set('end', end)
  return requestJson(fetchImpl, config, url, MAX_CALENDAR_BYTES, calendarId, log)
}

export function fetchStatesRaw(
  fetchImpl: FetchImpl,
  config: HaConfig,
  log: (message: string) => void
): Promise<unknown> {
  const url = new URL(`${config.baseUrl}/api/states`)
  return requestJson(fetchImpl, config, url, MAX_STATES_BYTES, 'states', log)
}
