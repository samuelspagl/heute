import type { Database } from 'bun:sqlite'
import { isCalendarIcon } from '~~/shared/calendar'
import type { CalendarStoredSettings } from './homeassistant/handler'

export const defaultCalendarSettings: CalendarStoredSettings = {
  selection: [],
  icons: {},
  dayGrouping: true
}

function sanitize(value: unknown): CalendarStoredSettings {
  if (typeof value !== 'object' || value === null) return defaultCalendarSettings
  const record = value as Record<string, unknown>

  const selection = Array.isArray(record.selection)
    ? [...new Set(record.selection.filter((id): id is string => typeof id === 'string'))]
    : []

  const icons: Record<string, string> = {}
  if (typeof record.icons === 'object' && record.icons !== null) {
    for (const [id, icon] of Object.entries(record.icons as Record<string, unknown>)) {
      if (selection.includes(id) && isCalendarIcon(icon)) icons[id] = icon
    }
  }

  const dayGrouping = typeof record.dayGrouping === 'boolean' ? record.dayGrouping : true
  return { selection, icons, dayGrouping }
}

export function readCalendarSettings(connection: Database, owner: string): CalendarStoredSettings {
  const row = connection.query<{ settings: string }, [string, string]>(
    'SELECT settings FROM widget_settings WHERE owner = ? AND widget_id = ?'
  ).get(owner, 'calendar')
  if (!row) return defaultCalendarSettings
  try {
    return sanitize(JSON.parse(row.settings))
  } catch {
    return defaultCalendarSettings
  }
}

export function writeCalendarSettings(connection: Database, owner: string, settings: CalendarStoredSettings): void {
  connection.query(`
    INSERT INTO widget_settings (owner, widget_id, settings) VALUES (?, 'calendar', ?)
    ON CONFLICT (owner, widget_id) DO UPDATE SET settings = excluded.settings
  `).run(owner, JSON.stringify(settings))
}
