import { describe, expect, test } from 'bun:test'
import { parseCalendarQuery } from '../../server/utils/homeassistant/calendar'

const NOW = new Date('2026-11-11T12:34:56Z')

describe('parseCalendarQuery', () => {
  test('applies the default range when both params are missing', () => {
    const result = parseCalendarQuery(new URLSearchParams(), NOW)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.start).toBe('2026-11-11T12:00:00.000Z')
    expect(result.end).toBe('2026-11-18T12:00:00.000Z')
    expect(result.calendarId).toBeUndefined()
  })

  test('rejects a single time parameter', () => {
    expect(parseCalendarQuery(new URLSearchParams('start=2026-11-11T00:00:00Z'), NOW).ok).toBe(false)
    expect(parseCalendarQuery(new URLSearchParams('end=2026-11-11T00:00:00Z'), NOW).ok).toBe(false)
  })

  test('rejects duplicate and unknown parameters', () => {
    expect(parseCalendarQuery(new URLSearchParams('start=a&start=b&end=c'), NOW).ok).toBe(false)
    expect(parseCalendarQuery(new URLSearchParams('start=a&end=b&foo=c'), NOW).ok).toBe(false)
  })

  test('canonicalizes ISO timestamps with an offset to UTC', () => {
    const result = parseCalendarQuery(new URLSearchParams('start=2026-11-11T10:00:00%2B01:00&end=2026-11-12T10:00:00%2B01:00'), NOW)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.start).toBe('2026-11-11T09:00:00.000Z')
    expect(result.end).toBe('2026-11-12T09:00:00.000Z')
  })

  test('rejects impossible calendar days', () => {
    expect(parseCalendarQuery(new URLSearchParams('start=2026-02-30T00:00:00Z&end=2026-03-01T00:00:00Z'), NOW).ok).toBe(false)
    expect(parseCalendarQuery(new URLSearchParams('start=2026-11-11T00:00:00Z&end=2026-11-32T00:00:00Z'), NOW).ok).toBe(false)
  })

  test('rejects offset-less timestamps', () => {
    expect(parseCalendarQuery(new URLSearchParams('start=2026-11-11T00:00:00&end=2026-11-12T00:00:00'), NOW).ok).toBe(false)
  })

  test('rejects start >= end', () => {
    expect(parseCalendarQuery(new URLSearchParams('start=2026-11-11T00:00:00Z&end=2026-11-11T00:00:00Z'), NOW).ok).toBe(false)
    expect(parseCalendarQuery(new URLSearchParams('start=2026-11-12T00:00:00Z&end=2026-11-11T00:00:00Z'), NOW).ok).toBe(false)
  })

  test('enforces the 31-day maximum range', () => {
    const ok = parseCalendarQuery(new URLSearchParams('start=2026-11-01T00:00:00Z&end=2026-12-02T00:00:00Z'), NOW)
    expect(ok.ok).toBe(true)
    const tooLarge = parseCalendarQuery(new URLSearchParams('start=2026-11-01T00:00:00Z&end=2026-12-03T00:00:00Z'), NOW)
    expect(tooLarge.ok).toBe(false)
  })

  test('rejects the removed calendarId parameter', () => {
    expect(parseCalendarQuery(new URLSearchParams('calendarId=calendar.family'), NOW).ok).toBe(false)
    expect(parseCalendarQuery(new URLSearchParams('start=2026-11-11T00:00:00Z&end=2026-11-12T00:00:00Z&calendarId=calendar.family'), NOW).ok).toBe(false)
  })
})
