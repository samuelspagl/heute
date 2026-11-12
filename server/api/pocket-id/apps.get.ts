import type { PocketIdApp } from '~~/shared/dashboard'

export default defineEventHandler(async (event): Promise<PocketIdApp[]> => {
  const config = await requirePocketIdImport(event)
  const apps = await listPocketIdApps(config)
  const existing = familyShortcutUrls(db(event))
  return [...apps.values()].sort((a, b) => a.name.localeCompare(b.name, 'de')).map(app => {
    let status: PocketIdApp['status'] = 'available'
    if (!app.url) status = 'invalid-url'
    else if (existing.has(app.url)) status = 'existing'
    else if (!pocketIdShortcut(app)) status = 'invalid-name'
    return { ...app, status }
  })
})
