export interface CalendarEvent {
  id: string
  calendarId: string
  title: string
  start: string
  end: string
  allDay: boolean
  description?: string
  location?: string
}

export type CalendarSourceState = 'fresh' | 'stale' | 'unavailable'

export interface CalendarSource {
  calendarId: string
  state: CalendarSourceState
  fetchedAt: string | null
}

export interface CalendarInfo {
  id: string
  name: string
  color: string
}

export interface CalendarEventInfo extends CalendarInfo {
  icon: string | null
}

export interface CalendarResult {
  enabled: boolean
  configured: boolean
  timezone: string
  range: { start: string; end: string }
  dayGrouping: boolean
  calendars: CalendarEventInfo[]
  events: CalendarEvent[]
  partial: boolean
  sources: CalendarSource[]
}

export interface CalendarSettings {
  enabled: boolean
  timezone: string
  calendars: CalendarInfo[]
  selection: string[]
  icons: Record<string, string>
  dayGrouping: boolean
}

export const calendarIcons = [
  'calendar',
  'calendar-days',
  'house',
  'users',
  'briefcase',
  'graduation-cap',
  'heart',
  'plane',
  'party-popper',
  'dumbbell',
  'book-open',
  'baby',
  'dog',
  'church',
  'music',
  'trophy',
  'leaf',
  'star'
] as const

export type CalendarIcon = typeof calendarIcons[number]

export const calendarColors = [
  '#2f6fed',
  '#d6486a',
  '#2f9e63',
  '#c07a1e',
  '#7d4fd1',
  '#1f9bb5',
  '#b0483f',
  '#5b7a99'
] as const

export function calendarName(id: string): string {
  return id
    .replace(/^calendar\./, '')
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function calendarColor(id: string): string {
  let hash = 0
  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }
  return calendarColors[hash % calendarColors.length]!
}

export function isCalendarIcon(value: unknown): value is CalendarIcon {
  return typeof value === 'string' && (calendarIcons as readonly string[]).includes(value)
}
