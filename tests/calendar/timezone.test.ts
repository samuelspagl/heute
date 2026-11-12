import { describe, expect, test } from 'bun:test'
import { formatInTimeZone, sortEvents } from '../../server/utils/homeassistant/calendar'
import type { CalendarEvent } from '../../shared/calendar'

function event(partial: Partial<CalendarEvent> & { id: string; start: string }): CalendarEvent {
  return { calendarId: 'calendar.family', title: 'T', end: partial.start, allDay: false, ...partial }
}

describe('formatInTimeZone', () => {
  test('handles Berlin spring forward on 2026-03-29', () => {
    expect(formatInTimeZone('2026-03-29T01:30:00.000Z', 'Europe/Berlin')).toBe('2026-03-29T03:30:00')
  })

  test('handles Berlin fall back on 2026-10-25', () => {
    expect(formatInTimeZone('2026-10-25T01:30:00.000Z', 'Europe/Berlin')).toBe('2026-10-25T02:30:00')
  })

  test('shows UTC day boundaries in the display zone', () => {
    expect(formatInTimeZone('2026-11-11T23:30:00.000Z', 'Europe/Berlin')).toBe('2026-11-12T00:30:00')
    expect(formatInTimeZone('2026-11-11T23:30:00.000Z', 'UTC')).toBe('2026-11-11T23:30:00')
  })
})

describe('sortEvents', () => {
  test('sorts chronologically in the display zone with all-day first', () => {
    const events = [
      event({ id: 'timed-late', start: '2026-11-11T23:30:00.000Z' }),
      event({ id: 'all-day', start: '2026-11-12', end: '2026-11-13', allDay: true }),
      event({ id: 'timed-early', start: '2026-11-11T10:00:00.000Z' })
    ]
    const sorted = sortEvents(events, 'Europe/Berlin')
    expect(sorted.map(e => e.id)).toEqual(['timed-early', 'all-day', 'timed-late'])
  })

  test('orders the same events differently depending on timezone', () => {
    const events = [
      event({ id: 'timed', start: '2026-11-11T23:30:00.000Z' }),
      event({ id: 'all-day', start: '2026-11-12', end: '2026-11-13', allDay: true })
    ]
    expect(sortEvents(events, 'Europe/Berlin').map(e => e.id)).toEqual(['all-day', 'timed'])
    expect(sortEvents(events, 'UTC').map(e => e.id)).toEqual(['timed', 'all-day'])
  })

  test('uses the id as a deterministic tiebreaker', () => {
    const events = [
      event({ id: 'b', start: '2026-11-11T10:00:00.000Z' }),
      event({ id: 'a', start: '2026-11-11T10:00:00.000Z' })
    ]
    expect(sortEvents(events, 'UTC').map(e => e.id)).toEqual(['a', 'b'])
  })
})
