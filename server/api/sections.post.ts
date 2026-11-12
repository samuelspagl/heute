export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const body = await readBody<{ scope?: string, action?: string, id?: string, title?: string }>(event)
  if (!body || !['personal', 'family'].includes(body.scope ?? '') || !['save', 'remove'].includes(body.action ?? '')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid section action' })
  }
  if (body.scope === 'family' && !user.admin) {
    throw createError({ statusCode: 403, statusMessage: 'Admin permission required' })
  }

  const owner = body.scope === 'family' ? '' : user.id
  const connection = db(event)
  const id = typeof body.id === 'string' ? body.id : ''
  if (body.action === 'remove') {
    const result = connection.query(`
      DELETE FROM link_sections WHERE owner = ? AND id = ?
      AND NOT EXISTS (SELECT 1 FROM links WHERE owner = ? AND section_id = ?)
    `).run(owner, id, owner, id)
    if (!result.changes) throw createError({ statusCode: 409, statusMessage: 'Section is not removable' })
  } else {
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    if (!title || title.length > 60) throw createError({ statusCode: 400, statusMessage: 'Invalid section name' })
    if (id) {
      const result = connection.query('UPDATE link_sections SET title = ? WHERE owner = ? AND id = ?').run(title, owner, id)
      if (!result.changes) throw createError({ statusCode: 404, statusMessage: 'Section not found' })
    } else {
      connection.query('INSERT INTO link_sections (id, owner, title) VALUES (?, ?, ?)').run(crypto.randomUUID(), owner, title)
    }
  }
  return { ok: true }
})
