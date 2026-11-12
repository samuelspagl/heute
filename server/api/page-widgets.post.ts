import { insertInOrder, type PageWidgetChange } from '~~/shared/dashboard'

const widgetIdPattern = /^[a-z0-9-]{1,40}$/

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const body = await readBody<PageWidgetChange>(event)
  if (!body || !['add', 'remove', 'move'].includes(body.action) ||
      typeof body.pageId !== 'string' || typeof body.widgetId !== 'string' ||
      !widgetIdPattern.test(body.widgetId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid widget action' })
  }

  const connection = db(event)
  const page = findPage(connection, body.pageId, user)
  if (!page) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  if (page.owner === '' && !user.admin) {
    throw createError({ statusCode: 403, statusMessage: 'Admin permission required' })
  }
  if (page.owner !== '' && page.owner !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  connection.transaction(() => {
    if (body.action === 'add') {
      const next = connection.query<{ position: number | null }, [string]>(
        'SELECT MAX(position) AS position FROM page_widgets WHERE page_id = ?'
      ).get(body.pageId)
      connection.query('INSERT OR IGNORE INTO page_widgets (page_id, widget_id, settings, position) VALUES (?, ?, ?, ?)')
        .run(body.pageId, body.widgetId, '{}', (next?.position ?? -1) + 1)
      return
    }
    if (body.action === 'remove') {
      connection.query('DELETE FROM page_widgets WHERE page_id = ? AND widget_id = ?').run(body.pageId, body.widgetId)
      return
    }
    if (body.action === 'move') {
      const ids = connection.query<{ widget_id: string }, [string]>(
        'SELECT widget_id FROM page_widgets WHERE page_id = ? ORDER BY position, rowid'
      ).all(body.pageId).map(row => row.widget_id)
      const ordered = ids.includes(body.widgetId) && insertInOrder(ids, body.widgetId, body.anchor, body.after)
      if (!ordered) throw createError({ statusCode: 409, statusMessage: 'Widget order has changed' })
      const update = connection.query('UPDATE page_widgets SET position = ? WHERE page_id = ? AND widget_id = ?')
      ordered.forEach((widgetId, position) => update.run(position, body.pageId, widgetId))
    }
  }).immediate()
  return { ok: true }
})
