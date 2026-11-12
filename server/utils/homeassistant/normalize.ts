import { createHash } from 'node:crypto'
import { calendarColor, calendarName, type CalendarEvent, type CalendarInfo } from '../../../shared/calendar'
import { CALENDAR_ID_PATTERN } from './client'

export type NormalizeResult =
  | { ok: true; events: CalendarEvent[] }
  | { ok: false; reason: string }

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function isValidDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return false
  return day >= 1 && day <= daysInMonth(year, month)
}

export function parseIsoDateTime(value: string): number | null {
  const match = DATETIME_PATTERN.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const timezone = match[8]!
  if (month < 1 || month > 12) return null
  if (day < 1 || day > daysInMonth(year, month)) return null
  if (hour > 23 || minute > 59 || second > 59) return null

  let offsetMinutes = 0
  if (timezone !== 'Z') {
    const offset = /^([+-])(\d{2}):(\d{2})$/.exec(timezone)
    if (!offset) return null
    const offsetHour = Number(offset[2])
    const offsetMinute = Number(offset[3])
    if (offsetHour > 23 || offsetMinute > 59) return null
    offsetMinutes = (offsetHour * 60 + offsetMinute) * (offset[1] === '-' ? -1 : 1)
  }

  return Date.UTC(year, month - 1, day, hour, minute, second) - offsetMinutes * 60_000
}

type ParsedDate =
  | { kind: 'date'; value: string }
  | { kind: 'dateTime'; ms: number }

function parseDateObject(value: unknown): ParsedDate | null {
  if (!isPlainObject(value)) return null
  const date = value.date
  const dateTime = value.dateTime
  if (typeof date === 'string' && dateTime === undefined) {
    if (!isValidDateString(date)) return null
    return { kind: 'date', value: date }
  }
  if (typeof dateTime === 'string' && date === undefined) {
    const ms = parseIsoDateTime(dateTime)
    if (ms === null) return null
    return { kind: 'dateTime', ms }
  }
  return null
}

function buildEventId(
  calendarId: string,
  uid: string | undefined,
  recurrence: string | undefined,
  start: string,
  end: string,
  title: string
): string {
  if (uid) {
    const sourceKey = recurrence ? `${uid}/${recurrence}` : uid
    return `${calendarId}::${sourceKey}::${start}`
  }
  const hash = createHash('sha256')
    .update([calendarId, title, start, end].join('\n'))
    .digest('hex')
    .slice(0, 32)
  return `${calendarId}::${hash}`
}

function normalizeEvent(rawEvent: unknown, calendarId: string): CalendarEvent | null {
  if (!isPlainObject(rawEvent)) return null

  const title = rawEvent.summary
  if (typeof title !== 'string' || title.trim() === '') return null

  const start = parseDateObject(rawEvent.start)
  const end = parseDateObject(rawEvent.end)
  if (!start || !end) return null

  let startStr: string
  let endStr: string
  let allDay: boolean

  if (start.kind === 'date' && end.kind === 'date') {
    if (start.value >= end.value) return null
    allDay = true
    startStr = start.value
    endStr = end.value
  } else if (start.kind === 'dateTime' && end.kind === 'dateTime') {
    if (start.ms >= end.ms) return null
    allDay = false
    startStr = new Date(start.ms).toISOString()
    endStr = new Date(end.ms).toISOString()
  } else {
    return null
  }

  const description = typeof rawEvent.description === 'string' ? rawEvent.description : undefined
  const location = typeof rawEvent.location === 'string' ? rawEvent.location : undefined
  const uid = typeof rawEvent.uid === 'string' && rawEvent.uid.trim() !== '' ? rawEvent.uid : undefined
  const recurrence = typeof rawEvent.recurrence_id === 'string' ? rawEvent.recurrence_id : undefined

  const event: CalendarEvent = {
    id: buildEventId(calendarId, uid, recurrence, startStr, endStr, title),
    calendarId,
    title,
    start: startStr,
    end: endStr,
    allDay
  }
  if (description !== undefined) event.description = description
  if (location !== undefined) event.location = location
  return event
}

const COLOR_PATTERN = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|rgba?\([^)]*\))$/i

export type CalendarListResult =
  | { ok: true; calendars: CalendarInfo[] }
  | { ok: false; reason: string }

export function normalizeCalendarList(raw: unknown): CalendarListResult {
  if (!Array.isArray(raw)) return { ok: false, reason: 'not an array' }

  const calendars: CalendarInfo[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!isPlainObject(item)) continue
    const entityId = item.entity_id
    if (typeof entityId !== 'string' || !CALENDAR_ID_PATTERN.test(entityId)) continue
    if (seen.has(entityId)) continue
    seen.add(entityId)

    const attributes = isPlainObject(item.attributes) ? item.attributes : {}
    const friendlyName = typeof attributes.friendly_name === 'string' && attributes.friendly_name.trim() !== ''
      ? attributes.friendly_name.trim()
      : calendarName(entityId)
    const color = typeof attributes.color === 'string' && COLOR_PATTERN.test(attributes.color)
      ? attributes.color
      : calendarColor(entityId)

    calendars.push({ id: entityId, name: friendlyName, color })
  }

  calendars.sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return { ok: true, calendars: calendars.slice(0, 100) }
}

export function normalizeCalendarResponse(raw: unknown, calendarId: string): NormalizeResult {
  if (!Array.isArray(raw)) return { ok: false, reason: 'not an array' }

  const events: CalendarEvent[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const event = normalizeEvent(item, calendarId)
    if (!event) return { ok: false, reason: 'invalid event' }
    if (seen.has(event.id)) continue
    seen.add(event.id)
    events.push(event)
  }
  return { ok: true, events }
}
