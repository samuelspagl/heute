import { createError, createEvent } from 'h3'
import type { H3Event } from 'h3'
import { describe, expect, test } from 'bun:test'
import { CalendarCache, DiscoveryCache, IdentityRateLimiter } from '../../server/utils/homeassistant/calendar-cache'
import type { FetchImpl, HaRawConfig } from '../../server/utils/homeassistant/client'
import {
  createCalendarEventsHandler,
  createCalendarSettingsGetHandler,
  createCalendarSettingsPutHandler,
  type CalendarHandlerDeps,
  type CalendarStoredSettings
} from '../../server/utils/homeassistant/handler'

const familyEvents = [
  {
    summary: 'Abendessen',
    start: { dateTime: '2026-11-11T18:30:00+01:00' },
    end: { dateTime: '2026-11-11T20:00:00+01:00' },
    uid: 'dinner'
  }
]

const statesPayload = [
  { entity_id: 'calendar.family', attributes: { friendly_name: 'Familie' } },
  { entity_id: 'calendar.school', attributes: { friendly_name: 'Schule' } },
  { entity_id: 'light.kitchen', attributes: { friendly_name: 'Küche' } }
]

const validRawConfig: HaRawConfig = {
  haUrl: 'http://ha.example.test',
  haToken: 'token',
  haCalendarIds: 'calendar.family,calendar.school',
  haRequestTimeoutMs: 10000,
  haCacheTtlSeconds: 90,
  haCalendarTimezone: 'Europe/Berlin'
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function makeEvent(path = '/api/calendar/events'): H3Event {
  const headers: Record<string, string> = {}
  const res = {
    setHeader: (name: string, value: string) => { headers[name] = value },
    getHeader: (name: string) => headers[name]
  }
  const req = { url: path, headers: { host: 'example.test' }, method: 'GET' }
  return createEvent(req as never, res as never)
}

function setup(overrides: Partial<CalendarHandlerDeps> = {}) {
  const fetchCalls = { count: 0 }
  const stores = new Map<string, CalendarStoredSettings>()
  let currentUser = 'user-1'
  let currentBody: unknown = undefined
  let authFn: () => Promise<{ id?: string } | null> = async () => ({ id: currentUser })

  const cache = new CalendarCache({ ttlMs: 90_000 })
  const discovery = new DiscoveryCache(600_000)
  const identityLimiter = new IdentityRateLimiter(30, 60_000)

  const defaultFetch: FetchImpl = async input => {
    const url = input instanceof URL ? input : new URL(String(input))
    fetchCalls.count++
    if (url.pathname === '/api/states') return jsonResponse(statesPayload)
    if (url.pathname.startsWith('/api/calendars/')) return jsonResponse(familyEvents)
    return new Response('not found', { status: 404 })
  }

  const deps: CalendarHandlerDeps = {
    authenticate: () => authFn(),
    rawConfig: () => validRawConfig,
    readSettings: (_event, owner) => stores.get(owner) ?? { selection: [], icons: {}, dayGrouping: true },
    writeSettings: (_event, owner, settings) => { stores.set(owner, settings) },
    fetchImpl: defaultFetch,
    now: () => Date.now(),
    log: () => {},
    getCache: () => cache,
    getDiscovery: () => discovery,
    identityLimiter,
    readBody: async () => currentBody,
    checkOrigin: () => {},
    ...overrides
  }

  return {
    deps,
    stores,
    fetchCalls,
    cache,
    identityLimiter,
    setUser: (id: string) => { currentUser = id },
    setBody: (body: unknown) => { currentBody = body },
    setAuth: (fn: () => Promise<{ id?: string } | null>) => { authFn = fn }
  }
}

describe('calendar events handler', () => {
  test('returns 401 without a session', async () => {
    const { deps, fetchCalls } = setup({
      authenticate: async () => {
        throw createError({ statusCode: 401 })
      }
    })
    await expect(createCalendarEventsHandler(deps)(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
    expect(fetchCalls.count).toBe(0)
  })

  test('returns 403 for an invalid identity without any HA call', async () => {
    const { deps, fetchCalls } = setup({ authenticate: async () => ({ id: '' }) })
    await expect(createCalendarEventsHandler(deps)(makeEvent())).rejects.toMatchObject({ statusCode: 403 })
    expect(fetchCalls.count).toBe(0)
  })

  test('rate limits per identity with 429', async () => {
    const limiter = new IdentityRateLimiter(2, 60_000)
    const { deps } = setup({ identityLimiter: limiter })
    const handler = createCalendarEventsHandler(deps)
    await handler(makeEvent())
    await handler(makeEvent())
    const event = makeEvent()
    await expect(handler(event)).rejects.toMatchObject({ statusCode: 429 })
    expect(event.node.res.getHeader('retry-after')).toBe(60)
  })

  test('rejects a removed/unexpected query parameter', async () => {
    const { deps } = setup()
    await expect(createCalendarEventsHandler(deps)(makeEvent('/api/calendar/events?calendarId=calendar.family')))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('returns a disabled result when HA is not configured', async () => {
    const { deps, fetchCalls } = setup({
      rawConfig: () => ({ ...validRawConfig, haUrl: '', haToken: '', haCalendarIds: '' })
    })
    const result = await createCalendarEventsHandler(deps)(makeEvent())
    expect(result.enabled).toBe(false)
    expect(result.configured).toBe(false)
    expect(result.events).toEqual([])
    expect(fetchCalls.count).toBe(0)
  })

  test('returns 503 for an invalid partial configuration', async () => {
    const { deps } = setup({ rawConfig: () => ({ ...validRawConfig, haToken: '' }) })
    await expect(createCalendarEventsHandler(deps)(makeEvent())).rejects.toMatchObject({ statusCode: 503 })
  })

  test('returns not configured when the user has no calendar selection', async () => {
    const { deps } = setup()
    const result = await createCalendarEventsHandler(deps)(makeEvent())
    expect(result.enabled).toBe(true)
    expect(result.configured).toBe(false)
    expect(result.events).toEqual([])
  })

  test('returns events for the saved selection', async () => {
    const { deps, stores } = setup()
    stores.set('user-1', { selection: ['calendar.family', 'calendar.school'], icons: { 'calendar.family': 'house' }, dayGrouping: true })
    const result = await createCalendarEventsHandler(deps)(makeEvent())
    expect(result.enabled).toBe(true)
    expect(result.configured).toBe(true)
    expect(result.events).toHaveLength(2)
    expect(result.calendars.map(calendar => calendar.id)).toEqual(['calendar.family', 'calendar.school'])
    expect(result.calendars.find(calendar => calendar.id === 'calendar.family')?.icon).toBe('house')
    expect(result.sources.every(source => source.state === 'fresh')).toBe(true)
    expect(result.partial).toBe(false)
  })

  test('marks partial when one source fails', async () => {
    const { deps, stores } = setup({
      fetchImpl: async input => {
        const url = input instanceof URL ? input : new URL(String(input))
        if (url.pathname === '/api/states') return jsonResponse(statesPayload)
        if (url.pathname.includes('calendar.school')) return new Response('oops', { status: 500 })
        return jsonResponse(familyEvents)
      }
    })
    stores.set('user-1', { selection: ['calendar.family', 'calendar.school'], icons: {}, dayGrouping: true })
    const result = await createCalendarEventsHandler(deps)(makeEvent())
    expect(result.partial).toBe(true)
    expect(result.sources.find(source => source.calendarId === 'calendar.school')?.state).toBe('unavailable')
    expect(result.events).toHaveLength(1)
  })

  test('returns 502 on a total upstream failure', async () => {
    const { deps, stores } = setup({
      fetchImpl: async input => {
        const url = input instanceof URL ? input : new URL(String(input))
        if (url.pathname === '/api/states') return jsonResponse(statesPayload)
        return new Response('oops', { status: 500 })
      }
    })
    stores.set('user-1', { selection: ['calendar.family', 'calendar.school'], icons: {}, dayGrouping: true })
    await expect(createCalendarEventsHandler(deps)(makeEvent())).rejects.toMatchObject({ statusCode: 502 })
  })

  test('returns 504 when all upstream requests time out', async () => {
    const { deps, stores } = setup({
      fetchImpl: async input => {
        const url = input instanceof URL ? input : new URL(String(input))
        if (url.pathname === '/api/states') return jsonResponse(statesPayload)
        throw new DOMException('The operation timed out', 'TimeoutError')
      }
    })
    stores.set('user-1', { selection: ['calendar.family', 'calendar.school'], icons: {}, dayGrouping: true })
    await expect(createCalendarEventsHandler(deps)(makeEvent())).rejects.toMatchObject({ statusCode: 504 })
  })

  test('enforces auth even with a warm cache', async () => {
    const state = setup()
    state.stores.set('user-1', { selection: ['calendar.family'], icons: {}, dayGrouping: true })
    const handler = createCalendarEventsHandler(state.deps)
    await handler(makeEvent())

    state.setAuth(async () => {
      throw createError({ statusCode: 401 })
    })
    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('calendar settings handler', () => {
  test('returns discovered calendars for the user', async () => {
    const { deps, stores } = setup()
    stores.set('user-1', { selection: ['calendar.family'], icons: { 'calendar.family': 'heart' }, dayGrouping: false })
    const result = await createCalendarSettingsGetHandler(deps)(makeEvent('/api/calendar/settings'))
    expect(result.enabled).toBe(true)
    expect(result.calendars.map(calendar => calendar.id)).toEqual(['calendar.family', 'calendar.school'])
    expect(result.selection).toEqual(['calendar.family'])
    expect(result.icons).toEqual({ 'calendar.family': 'heart' })
    expect(result.dayGrouping).toBe(false)
  })

  test('filters discovered calendars by the configured ceiling', async () => {
    const { deps } = setup({
      rawConfig: () => ({ ...validRawConfig, haCalendarIds: 'calendar.family' })
    })
    const result = await createCalendarSettingsGetHandler(deps)(makeEvent('/api/calendar/settings'))
    expect(result.calendars.map(calendar => calendar.id)).toEqual(['calendar.family'])
  })

  test('returns disabled settings when HA is not configured', async () => {
    const { deps } = setup({
      rawConfig: () => ({ ...validRawConfig, haUrl: '', haToken: '', haCalendarIds: '' })
    })
    const result = await createCalendarSettingsGetHandler(deps)(makeEvent('/api/calendar/settings'))
    expect(result.enabled).toBe(false)
    expect(result.calendars).toEqual([])
  })

  test('returns 502 when discovery fails', async () => {
    const { deps } = setup({ fetchImpl: async () => new Response('oops', { status: 500 }) })
    await expect(createCalendarSettingsGetHandler(deps)(makeEvent('/api/calendar/settings')))
      .rejects.toMatchObject({ statusCode: 502 })
  })

  test('persists a valid selection per user', async () => {
    const state = setup()
    const put = createCalendarSettingsPutHandler(state.deps)
    const get = createCalendarSettingsGetHandler(state.deps)

    state.setUser('a')
    state.setBody({ selection: ['calendar.family'], icons: { 'calendar.family': 'house' }, dayGrouping: false })
    const saved = await put(makeEvent('/api/calendar/settings'))
    expect(saved.selection).toEqual(['calendar.family'])
    expect(saved.icons).toEqual({ 'calendar.family': 'house' })

    state.setUser('a')
    const aSettings = await get(makeEvent('/api/calendar/settings'))
    expect(aSettings.selection).toEqual(['calendar.family'])

    state.setUser('b')
    const bSettings = await get(makeEvent('/api/calendar/settings'))
    expect(bSettings.selection).toEqual([])
  })

  test('rejects a selection outside the allowlist with 400', async () => {
    const state = setup()
    state.setBody({ selection: ['calendar.other'], icons: {}, dayGrouping: true })
    await expect(createCalendarSettingsPutHandler(state.deps)(makeEvent('/api/calendar/settings')))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('rejects an invalid icon with 400', async () => {
    const state = setup()
    state.setBody({ selection: ['calendar.family'], icons: { 'calendar.family': 'not-an-icon' }, dayGrouping: true })
    await expect(createCalendarSettingsPutHandler(state.deps)(makeEvent('/api/calendar/settings')))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('rejects settings when HA is not configured', async () => {
    const state = setup({ rawConfig: () => ({ ...validRawConfig, haUrl: '', haToken: '', haCalendarIds: '' }) })
    state.setBody({ selection: [], icons: {}, dayGrouping: true })
    await expect(createCalendarSettingsPutHandler(state.deps)(makeEvent('/api/calendar/settings')))
      .rejects.toMatchObject({ statusCode: 400 })
  })

  test('requires authentication for settings', async () => {
    const { deps } = setup({ authenticate: async () => ({ id: '' }) })
    await expect(createCalendarSettingsGetHandler(deps)(makeEvent('/api/calendar/settings')))
      .rejects.toMatchObject({ statusCode: 403 })
  })
})
