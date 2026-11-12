import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { normalizeCalendarList, normalizeCalendarResponse } from '../../server/utils/homeassistant/normalize'

function fixture(name: string): unknown {
  const raw = readFileSync(join(import.meta.dir, '..', 'fixtures', 'calendar', name), 'utf8')
  return JSON.parse(raw)
}

describe('normalizeCalendarResponse', () => {
  test('accepts an empty list', () => {
    const result = normalizeCalendarResponse([], 'calendar.family')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.events).toEqual([])
  })

  test('normalizes timed and all-day events from a fixture', () => {
    const result = normalizeCalendarResponse(fixture('family.json'), 'calendar.family')
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.events).toHaveLength(2)

    const dinner = result.events.find(event => event.title === 'Abendessen')!
    expect(dinner.allDay).toBe(false)
    expect(dinner.start).toBe('2026-11-11T17:30:00.000Z')
    expect(dinner.end).toBe('2026-11-11T19:00:00.000Z')
    expect(dinner.description).toBe('Gemeinsam kochen')
    expect(dinner.location).toBe('Küche')
    expect(dinner.id).toContain('family-dinner')

    const birthday = result.events.find(event => event.title === 'Geburtstag Oma')!
    expect(birthday.allDay).toBe(true)
    expect(birthday.start).toBe('2026-11-14')
    expect(birthday.end).toBe('2026-11-15')
    expect(birthday.description).toBeUndefined()
    expect(birthday.location).toBeUndefined()
  })

  test('keeps series instances with the same uid distinct', () => {
    const result = normalizeCalendarResponse(fixture('series.json'), 'calendar.school')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.events).toHaveLength(2)
    expect(result.events[0]!.id).not.toBe(result.events[1]!.id)
    expect(result.events.every(event => event.id.includes('series-swim'))).toBe(true)
  })

  test('deduplicates identical normalized events', () => {
    const raw = [
      { summary: 'A', start: { dateTime: '2026-11-11T10:00:00Z' }, end: { dateTime: '2026-11-11T11:00:00Z' }, uid: 'dup' },
      { summary: 'A', start: { dateTime: '2026-11-11T10:00:00Z' }, end: { dateTime: '2026-11-11T11:00:00Z' }, uid: 'dup' }
    ]
    const result = normalizeCalendarResponse(raw, 'calendar.family')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.events).toHaveLength(1)
  })

  test('derives a deterministic id without a uid', () => {
    const raw = [
      { summary: 'A', start: { dateTime: '2026-11-11T10:00:00Z' }, end: { dateTime: '2026-11-11T11:00:00Z' } }
    ]
    const first = normalizeCalendarResponse(raw, 'calendar.family')
    const second = normalizeCalendarResponse(raw, 'calendar.family')
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) expect(first.events[0]!.id).toBe(second.events[0]!.id)
  })

  test('rejects a non-array response', () => {
    expect(normalizeCalendarResponse({}, 'calendar.family').ok).toBe(false)
    expect(normalizeCalendarResponse('nope', 'calendar.family').ok).toBe(false)
    expect(normalizeCalendarResponse(null, 'calendar.family').ok).toBe(false)
  })

  test('rejects the whole source when any event is malformed', () => {
    const raw = [
      { summary: 'OK', start: { dateTime: '2026-11-11T10:00:00Z' }, end: { dateTime: '2026-11-11T11:00:00Z' } },
      { summary: '', start: { dateTime: '2026-11-11T10:00:00Z' }, end: { dateTime: '2026-11-11T11:00:00Z' } }
    ]
    expect(normalizeCalendarResponse(raw, 'calendar.family').ok).toBe(false)
  })

  test('rejects mixed date/time pairs and invalid ranges', () => {
    const mixed = [{ summary: 'A', start: { date: '2026-11-11' }, end: { dateTime: '2026-11-11T11:00:00Z' } }]
    expect(normalizeCalendarResponse(mixed, 'calendar.family').ok).toBe(false)

    const reversed = [{ summary: 'A', start: { dateTime: '2026-11-11T11:00:00Z' }, end: { dateTime: '2026-11-11T10:00:00Z' } }]
    expect(normalizeCalendarResponse(reversed, 'calendar.family').ok).toBe(false)

    const sameDay = [{ summary: 'A', start: { date: '2026-11-11' }, end: { date: '2026-11-11' } }]
    expect(normalizeCalendarResponse(sameDay, 'calendar.family').ok).toBe(false)
  })

  test('rejects offset-less timestamps', () => {
    const raw = [{ summary: 'A', start: { dateTime: '2026-11-11T10:00:00' }, end: { dateTime: '2026-11-11T11:00:00' } }]
    expect(normalizeCalendarResponse(raw, 'calendar.family').ok).toBe(false)
  })
})

describe('normalizeCalendarList', () => {
  test('keeps only calendar entities and uses friendly names', () => {
    const raw = [
      { entity_id: 'calendar.family', attributes: { friendly_name: 'Familie' } },
      { entity_id: 'light.kitchen', attributes: { friendly_name: 'Küche' } },
      { entity_id: 'calendar.school', attributes: {} },
      { entity_id: 'calendar.FAMILY', attributes: {} }
    ]
    const result = normalizeCalendarList(raw)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.calendars.map(calendar => calendar.id)).toEqual(['calendar.family', 'calendar.school'])
    expect(result.calendars[0]!.name).toBe('Familie')
    expect(result.calendars[1]!.name).toBe('School')
    expect(result.calendars[1]!.color).toMatch(/^#[0-9a-f]{6}$/)
  })

  test('uses an HA color when present', () => {
    const raw = [{ entity_id: 'calendar.family', attributes: { friendly_name: 'Familie', color: '#123456' } }]
    const result = normalizeCalendarList(raw)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.calendars[0]!.color).toBe('#123456')
  })

  test('sorts by name and deduplicates', () => {
    const raw = [
      { entity_id: 'calendar.zeta', attributes: { friendly_name: 'Zeta' } },
      { entity_id: 'calendar.alpha', attributes: { friendly_name: 'Alpha' } },
      { entity_id: 'calendar.alpha', attributes: { friendly_name: 'Alpha' } }
    ]
    const result = normalizeCalendarList(raw)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.calendars.map(calendar => calendar.name)).toEqual(['Alpha', 'Zeta'])
  })

  test('rejects a non-array response', () => {
    expect(normalizeCalendarList({}).ok).toBe(false)
    expect(normalizeCalendarList('nope').ok).toBe(false)
  })
})
