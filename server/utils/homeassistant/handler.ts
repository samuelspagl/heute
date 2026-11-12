import { createError, defineEventHandler, getRequestURL, readBody, setHeader } from 'h3'
import type { H3Event } from 'h3'
import {
  calendarColor,
  calendarName,
  isCalendarIcon,
  type CalendarInfo,
  type CalendarResult,
  type CalendarSettings
} from '../../../shared/calendar'
import { HaConfigError, parseHaConfig, type FetchImpl, type HaRawConfig } from './client'
import {
  applyCeiling,
  CalendarStatusError,
  discoverCalendars,
  getCalendarResult,
  parseCalendarQuery
} from './calendar'
import type { CalendarCache, DiscoveryCache, IdentityRateLimiter } from './calendar-cache'

export interface CalendarStoredSettings {
  selection: string[]
  icons: Record<string, string>
  dayGrouping: boolean
}

export interface CalendarHandlerDeps {
  authenticate: (event: H3Event) => Promise<{ id?: string } | null>
  rawConfig: (event: H3Event) => HaRawConfig
  readSettings: (event: H3Event, owner: string) => CalendarStoredSettings
  writeSettings: (event: H3Event, owner: string, settings: CalendarStoredSettings) => void
  fetchImpl: FetchImpl
  now: () => number
  log: (message: string) => void
  getCache: (ttlMs: number) => CalendarCache
  getDiscovery: () => DiscoveryCache
  identityLimiter: IdentityRateLimiter
  readBody?: (event: H3Event) => Promise<unknown>
  checkOrigin?: (event: H3Event) => void
}

async function requireIdentity(deps: CalendarHandlerDeps, event: H3Event): Promise<{ id: string }> {
  const user = await deps.authenticate(event)
  if (!user?.id) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  if (!deps.identityLimiter.allow(user.id)) {
    setHeader(event, 'retry-after', 60)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
  return { id: user.id }
}

function parseConfigOrThrow(deps: CalendarHandlerDeps, event: H3Event) {
  try {
    return parseHaConfig(deps.rawConfig(event))
  } catch (error) {
    if (error instanceof HaConfigError) {
      deps.log(`calendar config invalid: ${error.message}`)
      throw createError({ statusCode: 503, statusMessage: 'Service unavailable' })
    }
    throw error
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function disabledResult(): CalendarSettings {
  return { enabled: false, timezone: '', calendars: [], selection: [], icons: {}, dayGrouping: true }
}

export function createCalendarEventsHandler(deps: CalendarHandlerDeps) {
  return defineEventHandler(async (event): Promise<CalendarResult> => {
    const user = await requireIdentity(deps, event)

    const query = parseCalendarQuery(getRequestURL(event).searchParams, new Date(deps.now()))
    if (!query.ok) throw createError({ statusCode: query.status, statusMessage: query.message })

    const parsed = parseConfigOrThrow(deps, event)
    if (!parsed.enabled) {
      return {
        enabled: false,
        configured: false,
        timezone: '',
        range: { start: query.start, end: query.end },
        dayGrouping: true,
        calendars: [],
        events: [],
        partial: false,
        sources: []
      }
    }

    const config = parsed.config
    const cache = deps.getCache(config.cacheTtlSeconds * 1000)
    const settings = deps.readSettings(event, user.id)
    const discovery = await discoverCalendars({
      config,
      fetchImpl: deps.fetchImpl,
      log: deps.log,
      cache,
      discovery: deps.getDiscovery()
    })

    const allowed: CalendarInfo[] = discovery.ok ? discovery.calendars : applyCeiling([], config.calendarIds)
    const allowedMap = new Map(allowed.map(calendar => [calendar.id, calendar]))
    const selection = allowed.length > 0
      ? settings.selection.filter(id => allowedMap.has(id))
      : settings.selection
    const metadata = new Map(
      selection.map(id => [id, allowedMap.get(id) ?? { id, name: calendarName(id), color: calendarColor(id) }])
    )

    try {
      return await getCalendarResult(
        { config, fetchImpl: deps.fetchImpl, now: deps.now, log: deps.log, cache },
        { start: query.start, end: query.end },
        { selection, icons: settings.icons, dayGrouping: settings.dayGrouping, metadata }
      )
    } catch (error) {
      if (error instanceof CalendarStatusError) {
        throw createError({ statusCode: error.status, statusMessage: error.message })
      }
      throw error
    }
  })
}

export function createCalendarSettingsGetHandler(deps: CalendarHandlerDeps) {
  return defineEventHandler(async (event): Promise<CalendarSettings> => {
    const user = await requireIdentity(deps, event)

    const parsed = parseConfigOrThrow(deps, event)
    if (!parsed.enabled) return disabledResult()

    const config = parsed.config
    const cache = deps.getCache(config.cacheTtlSeconds * 1000)
    const discovery = await discoverCalendars({
      config,
      fetchImpl: deps.fetchImpl,
      log: deps.log,
      cache,
      discovery: deps.getDiscovery()
    })
    if (!discovery.ok) throw createError({ statusCode: 502, statusMessage: 'Upstream failure' })

    const allowedIds = new Set(discovery.calendars.map(calendar => calendar.id))
    const settings = deps.readSettings(event, user.id)
    const selection = settings.selection.filter(id => allowedIds.has(id))
    const icons = Object.fromEntries(Object.entries(settings.icons).filter(([id]) => selection.includes(id)))

    return {
      enabled: true,
      timezone: config.timezone,
      calendars: discovery.calendars,
      selection,
      icons,
      dayGrouping: settings.dayGrouping
    }
  })
}

type ValidationResult =
  | { ok: true; settings: CalendarStoredSettings }
  | { ok: false; message: string }

function validateSettingsBody(body: unknown, allowedIds: Set<string>): ValidationResult {
  if (!isPlainObject(body)) return { ok: false, message: 'Invalid body' }

  const selectionRaw = body.selection
  if (!Array.isArray(selectionRaw)) return { ok: false, message: 'Invalid selection' }
  const selection: string[] = []
  const seen = new Set<string>()
  for (const raw of selectionRaw) {
    if (typeof raw !== 'string') return { ok: false, message: 'Invalid selection' }
    if (seen.has(raw)) continue
    if (!allowedIds.has(raw)) return { ok: false, message: 'Calendar not allowed' }
    seen.add(raw)
    selection.push(raw)
    if (selection.length > 20) return { ok: false, message: 'Too many calendars' }
  }

  const icons: Record<string, string> = {}
  if (body.icons !== undefined) {
    if (!isPlainObject(body.icons)) return { ok: false, message: 'Invalid icons' }
    for (const [id, icon] of Object.entries(body.icons)) {
      if (!allowedIds.has(id) || !seen.has(id)) continue
      if (!isCalendarIcon(icon)) return { ok: false, message: 'Invalid icon' }
      icons[id] = icon
    }
  }

  const dayGrouping = typeof body.dayGrouping === 'boolean' ? body.dayGrouping : true

  return { ok: true, settings: { selection, icons, dayGrouping } }
}

export function createCalendarSettingsPutHandler(deps: CalendarHandlerDeps) {
  return defineEventHandler(async (event): Promise<CalendarSettings> => {
    deps.checkOrigin?.(event)
    const user = await requireIdentity(deps, event)

    const parsed = parseConfigOrThrow(deps, event)
    if (!parsed.enabled) throw createError({ statusCode: 400, statusMessage: 'Calendar not configured' })

    const config = parsed.config
    const cache = deps.getCache(config.cacheTtlSeconds * 1000)
    const discovery = await discoverCalendars({
      config,
      fetchImpl: deps.fetchImpl,
      log: deps.log,
      cache,
      discovery: deps.getDiscovery()
    })
    if (!discovery.ok) throw createError({ statusCode: 502, statusMessage: 'Upstream failure' })

    const allowedIds = new Set(discovery.calendars.map(calendar => calendar.id))
    const body = deps.readBody ? await deps.readBody(event) : await readBody(event)
    const validated = validateSettingsBody(body, allowedIds)
    if (!validated.ok) throw createError({ statusCode: 400, statusMessage: validated.message })

    deps.writeSettings(event, user.id, validated.settings)
    return {
      enabled: true,
      timezone: config.timezone,
      calendars: discovery.calendars,
      selection: validated.settings.selection,
      icons: validated.settings.icons,
      dayGrouping: validated.settings.dayGrouping
    }
  })
}
