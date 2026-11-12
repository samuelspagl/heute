import { insertInOrder, pageTypes, type PageChange, type PageType } from '~~/shared/dashboard'

function isPageType(value: unknown): value is PageType {
  return (pageTypes as readonly unknown[]).includes(value)
}

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const body = await readBody<PageChange>(event)
  if (!body || !['personal', 'family'].includes(body.scope) ||
      !['save', 'remove', 'move', 'set-type'].includes(body.action)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid page action' })
  }
  if (body.scope === 'family' && !user.admin) {
    throw createError({ statusCode: 403, statusMessage: 'Admin permission required' })
  }

  const owner = body.scope === 'family' ? '' : user.id
  const connection = db(event)
  const id = typeof body.id === 'string' ? body.id : ''

  connection.transaction(() => {
    if (body.action === 'remove') {
      const total = connection.query<{ count: number }, [string, string]>(
        'SELECT COUNT(*) AS count FROM pages WHERE owner = ? OR owner = ?'
      ).get(user.id, '')
      if ((total?.count ?? 0) <= 1) throw createError({ statusCode: 409, statusMessage: 'The last page cannot be removed' })
      const result = connection.query('DELETE FROM pages WHERE id = ? AND owner = ?').run(id, owner)
      if (!result.changes) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
      return
    }

    if (body.action === 'move') {
      const ids = connection.query<{ id: string }, [string]>(
        'SELECT id FROM pages WHERE owner = ? ORDER BY position, rowid'
      ).all(owner).map(row => row.id)
      const ordered = ids.includes(id) && insertInOrder(ids, id, body.anchor, body.after)
      if (!ordered) throw createError({ statusCode: 409, statusMessage: 'Page order has changed' })
      const update = connection.query('UPDATE pages SET position = ? WHERE id = ? AND owner = ?')
      ordered.forEach((pageId, position) => update.run(position, pageId, owner))
      return
    }

    if (!isPageType(body.type)) throw createError({ statusCode: 400, statusMessage: 'Invalid page type' })

    if (body.action === 'set-type') {
      const result = connection.query('UPDATE pages SET type = ? WHERE id = ? AND owner = ?').run(body.type, id, owner)
      if (!result.changes) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
      return
    }

    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title || title.length > 60) throw createError({ statusCode: 400, statusMessage: 'Invalid page name' })
    if (id) {
      const result = connection.query('UPDATE pages SET title = ?, type = ? WHERE id = ? AND owner = ?')
        .run(title, body.type, id, owner)
      if (!result.changes) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
    } else {
      const next = connection.query<{ position: number | null }, [string]>(
        'SELECT MAX(position) AS position FROM pages WHERE owner = ?'
      ).get(owner)
      const position = (next?.position ?? -1) + 1
      const pageId = crypto.randomUUID()
      connection.query('INSERT INTO pages (id, owner, type, title, position, show_all) VALUES (?, ?, ?, ?, ?, 0)')
        .run(pageId, owner, body.type, title, position)
    }
  }).immediate()
  return { ok: true }
})
