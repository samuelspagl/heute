export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const config = await requirePocketIdImport(event)
  const body = await readBody<{ sectionId: string, apps: { id: string, url: string }[] }>(event)
  if (typeof body?.sectionId !== 'string' || !Array.isArray(body.apps) || !body.apps.length ||
      body.apps.some(app => typeof app?.id !== 'string' || !app.id || typeof app.url !== 'string' || !app.url)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Pocket ID selection' })
  }

  const { sectionId } = body
  const apps = await listPocketIdApps(config)
  const selected = body.apps.map(({ id, url }) => {
    const app = apps.get(id)
    const link = app?.url === url ? pocketIdShortcut(app) : null
    if (!link) throw createError({ statusCode: 409, statusMessage: 'Pocket ID selection has changed' })
    return link
  })

  const connection = db(event)
  const imported = connection.transaction(() => {
    if (sectionId && !connection.query("SELECT id FROM link_sections WHERE owner = '' AND id = ?").get(sectionId)) {
      throw createError({ statusCode: 404, statusMessage: 'Family section not found' })
    }
    const urls = familyShortcutUrls(connection)
    const newLinks = selected.filter(link => {
      if (urls.has(link.url)) return false
      urls.add(link.url)
      return true
    })
    if (!newLinks.length) return 0

    const current = connection.query<{ id: string, position: number }, [string]>(`
      SELECT id, position FROM links WHERE owner = '' AND section_id = ?
      ORDER BY position, title COLLATE NOCASE, id
    `).all(sectionId)
    if (current.length + newLinks.length > 10000) {
      throw createError({ statusCode: 422, statusMessage: 'Family section is full' })
    }

    let position = (current.at(-1)?.position ?? -1) + 1
    if (position + newLinks.length > 10000) {
      const update = connection.query("UPDATE links SET position = ? WHERE owner = '' AND id = ?")
      current.forEach((link, index) => update.run(index, link.id))
      position = current.length
    }
    const insert = connection.query(`
      INSERT INTO links (id, owner, title, url, icon, color, position, section_id)
      VALUES (?, '', ?, ?, ?, ?, ?, ?)
    `)
    newLinks.forEach((link, index) => {
      insert.run(crypto.randomUUID(), link.title, link.url, link.icon, link.color, position + index, sectionId)
    })
    return newLinks.length
  }).immediate()
  return { imported }
})
