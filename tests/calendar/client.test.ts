import { describe, expect, test } from 'bun:test'
import {
  fetchCalendarRaw,
  HaConfigError,
  HaHttpError,
  isStaleEligible,
  isTimeout,
  parseHaConfig,
  type FetchImpl,
  type HaConfig
} from '../../server/utils/homeassistant/client'

function config(overrides: Partial<HaConfig> = {}): HaConfig {
  return {
    baseUrl: 'http://ha.example.test',
    token: 'secret-token',
    calendarIds: ['calendar.family'],
    requestTimeoutMs: 1000,
    cacheTtlSeconds: 90,
    timezone: 'Europe/Berlin',
    generation: 'gen',
    ...overrides
  }
}

function noop() {}

describe('parseHaConfig', () => {
  test('completely empty configuration disables the feature', () => {
    const result = parseHaConfig({
      haUrl: '',
      haToken: '',
      haCalendarIds: '',
      haRequestTimeoutMs: 10000,
      haCacheTtlSeconds: 90,
      haCalendarTimezone: 'Europe/Berlin'
    })
    expect(result.enabled).toBe(false)
  })

  test('partial configuration throws HaConfigError', () => {
    expect(() => parseHaConfig({
      haUrl: 'http://ha.example.test',
      haToken: '',
      haCalendarIds: '',
      haRequestTimeoutMs: 10000,
      haCacheTtlSeconds: 90,
      haCalendarTimezone: 'Europe/Berlin'
    })).toThrow(HaConfigError)
  })

  test('rejects URLs with credentials, query or fragment', () => {
    const base = { haToken: 't', haCalendarIds: 'calendar.family', haRequestTimeoutMs: 10000, haCacheTtlSeconds: 90, haCalendarTimezone: 'Europe/Berlin' }
    expect(() => parseHaConfig({ ...base, haUrl: 'http://user:pass@ha.example.test' })).toThrow(HaConfigError)
    expect(() => parseHaConfig({ ...base, haUrl: 'http://ha.example.test?x=1' })).toThrow(HaConfigError)
    expect(() => parseHaConfig({ ...base, haUrl: 'http://ha.example.test#frag' })).toThrow(HaConfigError)
    expect(() => parseHaConfig({ ...base, haUrl: 'ftp://ha.example.test' })).toThrow(HaConfigError)
  })

  test('is enabled with url and token even without an id ceiling', () => {
    const result = parseHaConfig({
      haUrl: 'http://ha.example.test',
      haToken: 't',
      haCalendarIds: '',
      haRequestTimeoutMs: 10000,
      haCacheTtlSeconds: 90,
      haCalendarTimezone: 'Europe/Berlin'
    })
    expect(result.enabled).toBe(true)
    if (result.enabled) expect(result.config.calendarIds).toEqual([])
  })

  test('deduplicates and validates calendar ids', () => {
    const result = parseHaConfig({
      haUrl: 'http://ha.example.test',
      haToken: 't',
      haCalendarIds: 'calendar.family, calendar.school,calendar.family',
      haRequestTimeoutMs: 10000,
      haCacheTtlSeconds: 90,
      haCalendarTimezone: 'Europe/Berlin'
    })
    expect(result.enabled).toBe(true)
    if (result.enabled) expect(result.config.calendarIds).toEqual(['calendar.family', 'calendar.school'])
  })

  test('rejects invalid calendar ids', () => {
    expect(() => parseHaConfig({
      haUrl: 'http://ha.example.test',
      haToken: 't',
      haCalendarIds: 'calendar.FAMILY',
      haRequestTimeoutMs: 10000,
      haCacheTtlSeconds: 90,
      haCalendarTimezone: 'Europe/Berlin'
    })).toThrow(HaConfigError)
  })

  test('enforces timeout and ttl bounds', () => {
    const base = { haUrl: 'http://ha.example.test', haToken: 't', haCalendarIds: 'calendar.family', haCalendarTimezone: 'Europe/Berlin' }
    expect(() => parseHaConfig({ ...base, haRequestTimeoutMs: 500, haCacheTtlSeconds: 90 })).toThrow(HaConfigError)
    expect(() => parseHaConfig({ ...base, haRequestTimeoutMs: 10000, haCacheTtlSeconds: 10 })).toThrow(HaConfigError)
  })

  test('rejects invalid timezone', () => {
    expect(() => parseHaConfig({
      haUrl: 'http://ha.example.test',
      haToken: 't',
      haCalendarIds: 'calendar.family',
      haRequestTimeoutMs: 10000,
      haCacheTtlSeconds: 90,
      haCalendarTimezone: 'Not/AZone'
    })).toThrow(HaConfigError)
  })

  test('changes generation when token changes', () => {
    const base = { haUrl: 'http://ha.example.test', haCalendarIds: 'calendar.family', haRequestTimeoutMs: 10000, haCacheTtlSeconds: 90, haCalendarTimezone: 'Europe/Berlin' }
    const a = parseHaConfig({ ...base, haToken: 'one' })
    const b = parseHaConfig({ ...base, haToken: 'two' })
    expect(a.enabled).toBe(true)
    expect(b.enabled).toBe(true)
    if (a.enabled && b.enabled) expect(a.config.generation).not.toBe(b.config.generation)
  })
})

describe('fetchCalendarRaw', () => {
  test('builds the known HA path, headers and encoded params', async () => {
    let capturedUrl: URL | undefined
    let capturedInit: RequestInit | undefined
    const fetchImpl: FetchImpl = async (input, init) => {
      capturedUrl = input instanceof URL ? input : new URL(input)
      capturedInit = init
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    }

    await fetchCalendarRaw(fetchImpl, config(), 'calendar.family', '2026-11-11T10:00:00+01:00', '2026-11-12T10:00:00+01:00', noop)

    expect(capturedUrl?.pathname).toBe('/api/calendars/calendar.family')
    expect(capturedUrl?.searchParams.get('start')).toBe('2026-11-11T10:00:00+01:00')
    expect(capturedUrl?.searchParams.get('end')).toBe('2026-11-12T10:00:00+01:00')
    expect(capturedUrl?.search.includes('%2B01')).toBe(true)
    expect(capturedInit?.headers).toEqual(expect.objectContaining({
      authorization: 'Bearer secret-token',
      accept: 'application/json'
    }))
    expect(capturedInit?.redirect).toBe('manual')
  })

  test('rejects redirects', async () => {
    const fetchImpl: FetchImpl = async () => new Response(null, { status: 302, headers: { location: 'http://evil.test' } })
    await expect(fetchCalendarRaw(fetchImpl, config(), 'calendar.family', 's', 'e', noop)).rejects.toThrow(HaHttpError)
    try {
      await fetchCalendarRaw(fetchImpl, config(), 'calendar.family', 's', 'e', noop)
    } catch (error) {
      expect(error).toBeInstanceOf(HaHttpError)
      expect((error as HaHttpError).kind).toBe('redirect')
    }
  })

  test('maps HA 401/403/404/5xx to http errors with status', async () => {
    for (const status of [401, 403, 404, 500, 502]) {
      const fetchImpl: FetchImpl = async () => new Response('{}', { status })
      let caught: unknown
      try {
        await fetchCalendarRaw(fetchImpl, config(), 'calendar.family', 's', 'e', noop)
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(HaHttpError)
      expect((caught as HaHttpError).kind).toBe('http')
      expect((caught as HaHttpError).httpStatus).toBe(status)
    }
  })

  test('times out including the body read', async () => {
    const fetchImpl: FetchImpl = (_input, init) => {
      const stream = new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener('abort', () => {
            controller.error(new DOMException('The operation timed out', 'TimeoutError'))
          }, { once: true })
        }
      })
      return Promise.resolve(new Response(stream, { status: 200, headers: { 'content-type': 'application/json' } }))
    }

    let caught: unknown
    try {
      await fetchCalendarRaw(fetchImpl, config({ requestTimeoutMs: 20 }), 'calendar.family', 's', 'e', noop)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(HaHttpError)
    expect((caught as HaHttpError).kind).toBe('timeout')
  })

  test('enforces the content-length size limit', async () => {
    const fetchImpl: FetchImpl = async () => new Response('x', {
      status: 200,
      headers: { 'content-type': 'application/json', 'content-length': String(2 * 1024 * 1024 + 1) }
    })
    let caught: unknown
    try {
      await fetchCalendarRaw(fetchImpl, config(), 'calendar.family', 's', 'e', noop)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(HaHttpError)
    expect((caught as HaHttpError).kind).toBe('size_limit')
  })

  test('rejects invalid json', async () => {
    const fetchImpl: FetchImpl = async () => new Response('not json', { status: 200, headers: { 'content-type': 'application/json' } })
    let caught: unknown
    try {
      await fetchCalendarRaw(fetchImpl, config(), 'calendar.family', 's', 'e', noop)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(HaHttpError)
    expect((caught as HaHttpError).kind).toBe('invalid_response')
  })

  test('never logs the token, url or body', async () => {
    const logs: string[] = []
    const log = (message: string) => logs.push(message)
    const fetchImpl: FetchImpl = async () => new Response('super secret body', { status: 401 })
    try {
      await fetchCalendarRaw(fetchImpl, config({ token: 'topsecret-token' }), 'calendar.family', 's', 'e', log)
    } catch {
      // expected
    }
    for (const message of logs) {
      expect(message).not.toContain('topsecret-token')
      expect(message).not.toContain('super secret body')
      expect(message).not.toContain('http://ha.example.test')
    }
  })
})

describe('error classification', () => {
  test('stale fallback is only allowed for timeouts, network and 5xx', () => {
    expect(isStaleEligible(new HaHttpError('timeout', 'c'))).toBe(true)
    expect(isStaleEligible(new HaHttpError('network', 'c'))).toBe(true)
    expect(isStaleEligible(new HaHttpError('http', 'c', 500))).toBe(true)
    expect(isStaleEligible(new HaHttpError('http', 'c', 401))).toBe(false)
    expect(isStaleEligible(new HaHttpError('http', 'c', 403))).toBe(false)
    expect(isStaleEligible(new HaHttpError('http', 'c', 404))).toBe(false)
    expect(isStaleEligible(new HaHttpError('invalid_response', 'c'))).toBe(false)
    expect(isStaleEligible(new Error('nope'))).toBe(false)
  })

  test('timeout detection only matches timeout kind', () => {
    expect(isTimeout(new HaHttpError('timeout', 'c'))).toBe(true)
    expect(isTimeout(new HaHttpError('http', 'c', 500))).toBe(false)
  })
})
