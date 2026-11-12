import { calendarColor, calendarName, type CalendarEvent, type CalendarInfo, type CalendarResult, type CalendarSource } from '../../../shared/calendar'
import { fetchCalendarRaw, fetchStatesRaw, HaHttpError, isStaleEligible, OverloadError, type FetchImpl, type HaConfig } from './client'
import { normalizeCalendarList, normalizeCalendarResponse, parseIsoDateTime } from './normalize'
import type { CalendarCache, DiscoveryCache } from './calendar-cache'

const DEFAULT_RANGE_MS = 7 * 24 * 60 * 60_000
const MAX_RANGE_MS = 31 * 24 * 60 * 60_000
const HOUR_MS = 60 * 60_000

const ALLOWED_PARAMS = new Set(['start', 'end'])

export interface CalendarQuery {
  start: string
  end: string
}

export type QueryResult =
  | { ok: true; start: string; end: string }
  | { ok: false; status: number; message: string }

export function parseCalendarQuery(searchParams: URLSearchParams, now: Date): QueryResult {
  for (const key of searchParams.keys()) {
    if (!ALLOWED_PARAMS.has(key)) return { ok: false, status: 400, message: 'Unexpected query parameter' }
  }

  const startValues = searchParams.getAll('start')
  const endValues = searchParams.getAll('end')
  if (startValues.length > 1 || endValues.length > 1) {
    return { ok: false, status: 400, message: 'Duplicate query parameter' }
  }

  const hasStart = startValues.length === 1
  const hasEnd = endValues.length === 1
  if (hasStart !== hasEnd) {
    return { ok: false, status: 400, message: 'Both start and end are required' }
  }

  if (hasStart && hasEnd) {
    const startMs = parseIsoDateTime(startValues[0]!)
    const endMs = parseIsoDateTime(endValues[0]!)
    if (startMs === null || endMs === null) {
      return { ok: false, status: 400, message: 'Invalid timestamp' }
    }
    if (startMs >= endMs) {
      return { ok: false, status: 400, message: 'start must be before end' }
    }
    if (endMs - startMs > MAX_RANGE_MS) {
      return { ok: false, status: 400, message: 'Range too large' }
    }
    return { ok: true, start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() }
  }

  const startMs = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS
  return { ok: true, start: new Date(startMs).toISOString(), end: new Date(startMs + DEFAULT_RANGE_MS).toISOString() }
}

export class CalendarStatusError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'CalendarStatusError'
  }
}

export type SourceFailureKind = 'timeout' | 'http' | 'network' | 'redirect' | 'size_limit' | 'invalid_response' | 'overload' | 'other'

export type SourceOutcome =
  | { state: 'fresh'; fetchedAt: number; events: CalendarEvent[] }
  | { state: 'stale'; fetchedAt: number; events: CalendarEvent[] }
  | { state: 'unavailable'; kind: SourceFailureKind }

function failureKindOf(error: unknown): SourceFailureKind {
  if (error instanceof OverloadError) return 'overload'
  if (error instanceof HaHttpError) {
    switch (error.kind) {
      case 'timeout': return 'timeout'
      case 'network': return 'network'
      case 'redirect': return 'redirect'
      case 'size_limit': return 'size_limit'
      case 'http': return 'http'
      default: return 'invalid_response'
    }
  }
  return 'other'
}

export interface CalendarDeps {
  config: HaConfig
  fetchImpl: FetchImpl
  now: () => number
  log: (message: string) => void
  cache: CalendarCache
}

export interface DiscoveryDeps {
  config: HaConfig
  fetchImpl: FetchImpl
  log: (message: string) => void
  cache: CalendarCache
  discovery: DiscoveryCache
}

export function applyCeiling(discovered: CalendarInfo[], ceiling: string[]): CalendarInfo[] {
  if (ceiling.length === 0) return discovered
  const byId = new Map(discovered.map(calendar => [calendar.id, calendar]))
  return ceiling.map(id => byId.get(id) ?? { id, name: calendarName(id), color: calendarColor(id) })
}

export type DiscoveryResult =
  | { ok: true; calendars: CalendarInfo[] }
  | { ok: false }

export async function discoverCalendars(deps: DiscoveryDeps): Promise<DiscoveryResult> {
  const cached = deps.discovery.get(deps.config.generation)
  if (cached) return { ok: true, calendars: cached }

  try {
    const raw = await deps.cache.singleflight(`discovery::${deps.config.generation}`, () =>
      deps.cache.runLimited(async () => {
        if (!deps.cache.allowUpstream()) throw new OverloadError()
        return fetchStatesRaw(deps.fetchImpl, deps.config, deps.log)
      })
    )
    const normalized = normalizeCalendarList(raw)
    if (!normalized.ok) return { ok: false }
    const calendars = applyCeiling(normalized.calendars, deps.config.calendarIds)
    deps.discovery.set(deps.config.generation, calendars)
    return { ok: true, calendars }
  } catch {
    return { ok: false }
  }
}

async function fetchOneCalendar(
  deps: CalendarDeps,
  calendarId: string,
  start: string,
  end: string
): Promise<SourceOutcome> {
  const key = deps.cache.key(deps.config.generation, calendarId, start, end)

  const fresh = deps.cache.getFresh(key)
  if (fresh) return { state: 'fresh', fetchedAt: fresh.fetchedAt, events: fresh.events }

  const stale = deps.cache.getStale(key)

  if (deps.cache.hasRecentError(key)) {
    if (stale) return { state: 'stale', fetchedAt: stale.fetchedAt, events: stale.events }
    return { state: 'unavailable', kind: 'other' }
  }

  try {
    const fetchedAt = deps.now()
    const events = await deps.cache.singleflight(key, () =>
      deps.cache.runLimited(async () => {
        if (!deps.cache.allowUpstream()) throw new OverloadError()
        const raw = await fetchCalendarRaw(deps.fetchImpl, deps.config, calendarId, start, end, deps.log)
        const normalized = normalizeCalendarResponse(raw, calendarId)
        if (!normalized.ok) throw new HaHttpError('invalid_response', calendarId)
        return normalized.events
      })
    )
    deps.cache.set(key, events, fetchedAt)
    return { state: 'fresh', fetchedAt, events }
  } catch (error) {
    deps.cache.markError(key)
    if (isStaleEligible(error) && stale) {
      return { state: 'stale', fetchedAt: stale.fetchedAt, events: stale.events }
    }
    return { state: 'unavailable', kind: failureKindOf(error) }
  }
}

export function formatInTimeZone(iso: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(iso))
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '00'
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}:${value('second')}`
}

function sortKey(event: CalendarEvent, timezone: string): string {
  if (event.allDay) return `${event.start}T000000`
  return formatInTimeZone(event.start, timezone)
}

export function sortEvents(events: CalendarEvent[], timezone: string): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aKey = sortKey(a, timezone)
    const bKey = sortKey(b, timezone)
    if (aKey !== bKey) return aKey < bKey ? -1 : 1
    return a.id.localeCompare(b.id)
  })
}

export interface CalendarRenderOptions {
  selection: string[]
  icons: Record<string, string>
  dayGrouping: boolean
  metadata: Map<string, CalendarInfo>
}

export async function getCalendarResult(
  deps: CalendarDeps,
  query: CalendarQuery,
  options: CalendarRenderOptions
): Promise<CalendarResult> {
  const selection = options.selection

  if (selection.length === 0) {
    return {
      enabled: true,
      configured: false,
      timezone: deps.config.timezone,
      range: { start: query.start, end: query.end },
      dayGrouping: options.dayGrouping,
      calendars: [],
      events: [],
      partial: false,
      sources: []
    }
  }

  const outcomes = await Promise.all(
    selection.map(calendarId => fetchOneCalendar(deps, calendarId, query.start, query.end))
  )

  const events: CalendarEvent[] = []
  const sources: CalendarSource[] = []
  const unavailableKinds: SourceFailureKind[] = []

  selection.forEach((calendarId, index) => {
    const outcome = outcomes[index]!
    if (outcome.state === 'unavailable') {
      unavailableKinds.push(outcome.kind)
      sources.push({ calendarId, state: 'unavailable', fetchedAt: null })
    } else {
      events.push(...outcome.events)
      sources.push({ calendarId, state: outcome.state, fetchedAt: new Date(outcome.fetchedAt).toISOString() })
    }
  })

  const usable = outcomes.some(outcome => outcome.state !== 'unavailable')
  if (!usable) {
    if (unavailableKinds.includes('overload')) throw new CalendarStatusError(503, 'Service unavailable')
    if (unavailableKinds.length > 0 && unavailableKinds.every(kind => kind === 'timeout')) {
      throw new CalendarStatusError(504, 'Upstream timeout')
    }
    throw new CalendarStatusError(502, 'Upstream failure')
  }

  const calendars = selection.map(id => {
    const info = options.metadata.get(id) ?? { id, name: calendarName(id), color: calendarColor(id) }
    return { id, name: info.name, color: info.color, icon: options.icons[id] ?? null }
  })

  return {
    enabled: true,
    configured: true,
    timezone: deps.config.timezone,
    range: { start: query.start, end: query.end },
    dayGrouping: options.dayGrouping,
    calendars,
    events: sortEvents(events, deps.config.timezone),
    partial: unavailableKinds.length > 0,
    sources
  }
}
