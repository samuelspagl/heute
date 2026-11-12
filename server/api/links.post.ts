import { insertInOrder, type LinkScope, type Shortcut } from '~~/shared/dashboard'
import { parseShortcut } from '~~/shared/shortcut-input'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const body = await readBody<{
    scope: LinkScope, action: 'save' | 'remove' | 'favorite' | 'move' | 'move-favorite',
    id?: string, favorite?: boolean, link?: Partial<Shortcut>, sectionId?: string, anchor?: string, after?: boolean
  }>(event)
  if (!body || !['family', 'personal'].includes(body.scope) ||
      !['save', 'remove', 'favorite', 'move', 'move-favorite'].includes(body.action)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid link action' })
  }
  const owner = body.scope === 'family' ? '' : user.id
  const connection = db(event)
  const id = typeof body.id === 'string' ? body.id : ''
  const favoriteAction = body.action === 'favorite' || body.action === 'move-favorite'
  if (!favoriteAction && body.scope === 'family' && !user.admin) {
    throw createError({ statusCode: 403, statusMessage: 'Admin permission required' })
  }

  connection.transaction(() => {
    const existing = id ? connection.query<{ section_id: string }, [string, string]>(
      'SELECT section_id FROM links WHERE id = ? AND owner = ?'
    ).get(id, owner) : null
    if ((id || body.action !== 'save') && !existing) {
      throw createError({ statusCode: 404, statusMessage: 'Link not found' })
    }
    if (body.action === 'favorite') {
      if (typeof body.favorite !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'Invalid favorite action' })
      if (body.favorite) {
        connection.query(`
          INSERT OR IGNORE INTO favorites (owner, link_id, position)
          SELECT ?, ?, COALESCE(MAX(position), -1) + 1 FROM favorites WHERE owner = ?
        `).run(user.id, id, user.id)
      } else {
        connection.query('DELETE FROM favorites WHERE owner = ? AND link_id = ?').run(user.id, id)
      }
      return
    }
    if (body.action === 'move-favorite') {
      const ids = connection.query<{ link_id: string }, [string]>(
        'SELECT link_id FROM favorites WHERE owner = ? ORDER BY position, rowid'
      ).all(user.id).map(row => row.link_id)
      const ordered = ids.includes(id) && insertInOrder(ids, id, body.anchor, body.after)
      if (!ordered) throw createError({ statusCode: 409, statusMessage: 'Favorite order has changed' })
      const update = connection.query('UPDATE favorites SET position = ? WHERE owner = ? AND link_id = ?')
      ordered.forEach((linkId, position) => update.run(position, user.id, linkId))
      return
    }
    if (body.action === 'remove') {
      connection.query('DELETE FROM links WHERE id = ? AND owner = ?').run(id, owner)
      return
    }

    const sectionId = body.sectionId ?? existing?.section_id ?? ''
    if (typeof sectionId !== 'string' || (sectionId && !connection.query(
      'SELECT id FROM link_sections WHERE id = ? AND owner = ?'
    ).get(sectionId, owner))) {
      throw createError({ statusCode: 404, statusMessage: 'Section not found' })
    }
    if (body.action === 'move') {
      const ids = connection.query<{ id: string }, [string, string]>(
        'SELECT id FROM links WHERE owner = ? AND section_id = ? ORDER BY position, title COLLATE NOCASE, id'
      ).all(owner, sectionId).map(row => row.id)
      const ordered = insertInOrder(ids, id, body.anchor, body.after)
      if (!ordered || ordered.length > 10000) throw createError({ statusCode: 409, statusMessage: 'Link order has changed' })
      const update = connection.query('UPDATE links SET section_id = ?, position = ? WHERE id = ? AND owner = ?')
      ordered.forEach((linkId, position) => update.run(sectionId, position, linkId, owner))
      return
    }

    const parsed = parseShortcut(body.link)
    if (!parsed.link) throw createError({ statusCode: 400, statusMessage: parsed.error })
    const { title, url, icon, color, position } = parsed.link
    if (id) {
      connection.query('UPDATE links SET title = ?, url = ?, icon = ?, color = ?, position = ?, section_id = ? WHERE id = ? AND owner = ?')
        .run(title, url, icon, color, position, sectionId, id, owner)
    } else {
      connection.query('INSERT INTO links (id, owner, title, url, icon, color, position, section_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(crypto.randomUUID(), owner, title, url, icon, color, position, sectionId)
    }
  }).immediate()
  return { ok: true }
})
