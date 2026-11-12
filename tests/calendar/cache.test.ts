import { describe, expect, test } from 'bun:test'
import { CalendarCache, IdentityRateLimiter } from '../../server/utils/homeassistant/calendar-cache'
import { OverloadError } from '../../server/utils/homeassistant/client'
import type { CalendarEvent } from '../../shared/calendar'

function events(ids: string[]): CalendarEvent[] {
  return ids.map(id => ({ id, calendarId: 'calendar.family', title: id, start: '2026-11-11T10:00:00.000Z', end: '2026-11-11T11:00:00.000Z', allDay: false }))
}

function clock(start: number) {
  let current = start
  return {
    now: () => current,
    advance: (ms: number) => { current += ms }
  }
}

describe('CalendarCache', () => {
  test('serves fresh entries and expires after the TTL', () => {
    const time = clock(1_000_000)
    const cache = new CalendarCache({ ttlMs: 90_000, now: time.now })
    const key = cache.key('gen', 'calendar.family', 's', 'e')

    cache.set(key, events(['a']), time.now())
    expect(cache.getFresh(key)).toBeDefined()

    time.advance(90_001)
    expect(cache.getFresh(key)).toBeUndefined()
  })

  test('keeps stale data for up to ten minutes', () => {
    const time = clock(1_000_000)
    const cache = new CalendarCache({ ttlMs: 90_000, now: time.now })
    const key = cache.key('gen', 'calendar.family', 's', 'e')

    cache.set(key, events(['a']), time.now())
    time.advance(120_000)
    expect(cache.getFresh(key)).toBeUndefined()
    expect(cache.getStale(key)).toBeDefined()

    time.advance(10 * 60_000)
    expect(cache.getStale(key)).toBeUndefined()
  })

  test('deduplicates concurrent requests via singleflight', async () => {
    const cache = new CalendarCache({ ttlMs: 90_000 })
    let calls = 0
    const factory = async () => {
      calls++
      await new Promise(resolve => setTimeout(resolve, 5))
      return 'value'
    }
    const [a, b] = await Promise.all([
      cache.singleflight('k', factory),
      cache.singleflight('k', factory)
    ])
    expect(a).toBe('value')
    expect(b).toBe('value')
    expect(calls).toBe(1)
  })

  test('removes pending entries after settlement', async () => {
    const cache = new CalendarCache({ ttlMs: 90_000 })
    await cache.singleflight('k', async () => 'x')
    expect(cache.singleflight('k', async () => 'y')).resolves.toBe('y')
  })

  test('evicts the least recently used entry', () => {
    const cache = new CalendarCache({ ttlMs: 90_000, maxEntries: 2 })
    cache.set('a', events(['a']), Date.now())
    cache.set('b', events(['b']), Date.now())
    cache.getFresh('a')
    cache.set('c', events(['c']), Date.now())
    expect(cache.getFresh('a')).toBeDefined()
    expect(cache.getFresh('b')).toBeUndefined()
    expect(cache.getFresh('c')).toBeDefined()
  })

  test('separates entries by generation', () => {
    const cache = new CalendarCache({ ttlMs: 90_000 })
    cache.set(cache.key('gen-a', 'calendar.family', 's', 'e'), events(['a']), Date.now())
    expect(cache.getFresh(cache.key('gen-b', 'calendar.family', 's', 'e'))).toBeUndefined()
  })

  test('enforces error backoff', () => {
    const time = clock(1_000_000)
    const cache = new CalendarCache({ ttlMs: 90_000, now: time.now })
    const key = cache.key('gen', 'calendar.family', 's', 'e')
    expect(cache.hasRecentError(key)).toBe(false)
    cache.markError(key)
    expect(cache.hasRecentError(key)).toBe(true)
    time.advance(10_001)
    expect(cache.hasRecentError(key)).toBe(false)
  })

  test('limits parallel work and throws overload when the queue is full', async () => {
    const cache = new CalendarCache({ ttlMs: 90_000, maxParallel: 1, maxQueue: 1 })
    let active = 0
    let peak = 0
    const factory = async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise(resolve => setTimeout(resolve, 10))
      active--
      return true
    }
    const first = cache.runLimited(factory)
    const second = cache.runLimited(factory)
    const third = cache.runLimited(factory).then(() => null, error => error)
    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(true)
    expect(await third).toBeInstanceOf(OverloadError)
    expect(peak).toBe(1)
  })

  test('enforces the per-process upstream rate limit', () => {
    const time = clock(1_000_000)
    const cache = new CalendarCache({ ttlMs: 90_000, upstreamPerMinute: 2, now: time.now })
    expect(cache.allowUpstream()).toBe(true)
    expect(cache.allowUpstream()).toBe(true)
    expect(cache.allowUpstream()).toBe(false)
    time.advance(60_001)
    expect(cache.allowUpstream()).toBe(true)
  })
})

describe('IdentityRateLimiter', () => {
  test('allows up to the maximum requests per window', () => {
    const time = clock(1_000_000)
    const limiter = new IdentityRateLimiter(3, 60_000, time.now)
    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('a')).toBe(true)
    expect(limiter.allow('a')).toBe(false)
    expect(limiter.allow('b')).toBe(true)
    time.advance(60_001)
    expect(limiter.allow('a')).toBe(true)
  })
})
