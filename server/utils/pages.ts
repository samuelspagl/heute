import type { Database } from 'bun:sqlite'
import type { Page, PageType, PageWidget } from '~~/shared/dashboard'

export const defaultPageWidgets = ['weather', 'calendar', 'rss'] as const

interface PageRow {
  id: string
  owner: string
  type: string
  title: string
  position: number
  show_all: number
}

function toPage(row: PageRow): Page {
  return {
    id: row.id,
    scope: row.owner === '' ? 'family' : 'personal',
    type: (['normal', 'widget', 'fullscreen'] as const).includes(row.type as PageType) ? row.type as PageType : 'normal',
    title: row.title,
    position: row.position,
    showAll: row.show_all === 1
  }
}

export function readPages(connection: Database, owner: string): Page[] {
  return connection.query<PageRow, [string, string]>(
    'SELECT id, owner, type, title, position, show_all FROM pages WHERE owner = ? OR owner = ? ORDER BY position, rowid'
  ).all(owner, '').map(toPage)
}

export function readPageWidgets(connection: Database, pageIds: string[]): Record<string, PageWidget[]> {
  const result: Record<string, PageWidget[]> = {}
  if (!pageIds.length) return result
  const placeholders = pageIds.map(() => '?').join(', ')
  const rows = connection.query<{ page_id: string, widget_id: string, settings: string, position: number }, string[]>(
    `SELECT page_id, widget_id, settings, position FROM page_widgets WHERE page_id IN (${placeholders}) ORDER BY position, rowid`
  ).all(...pageIds)
  for (const row of rows) {
    ;(result[row.page_id] ??= []).push({ widgetId: row.widget_id, settings: row.settings, position: row.position })
  }
  return result
}

function ownsPage(connection: Database, pageId: string, owner: string): PageRow | null {
  return connection.query<PageRow, [string, string, string]>(
    'SELECT id, owner, type, title, position, show_all FROM pages WHERE id = ? AND (owner = ? OR owner = ?)'
  ).get(pageId, owner, '') ?? null
}

export function findPage(connection: Database, pageId: string, user: { id: string }): PageRow | null {
  return ownsPage(connection, pageId, user.id)
}

export function seedDefaultWidgets(connection: Database, pageId: string): void {
  const insert = connection.query(
    'INSERT OR IGNORE INTO page_widgets (page_id, widget_id, settings, position) VALUES (?, ?, ?, ?)'
  )
  defaultPageWidgets.forEach((widgetId, position) => insert.run(pageId, widgetId, '{}', position))
}

export function ensureDefaultPage(connection: Database, owner: string): void {
  const existing = connection.query<{ count: number }, [string]>(
    'SELECT COUNT(*) AS count FROM pages WHERE owner = ?'
  ).get(owner)
  if (existing && existing.count > 0) return
  const id = crypto.randomUUID()
  connection.query(
    'INSERT INTO pages (id, owner, type, title, position, show_all) VALUES (?, ?, ?, ?, ?, 1)'
  ).run(id, owner, 'normal', 'Start', 0)
  seedDefaultWidgets(connection, id)
}
