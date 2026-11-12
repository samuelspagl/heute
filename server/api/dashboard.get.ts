import { defaultAppearance } from '~~/shared/appearance'
import type { Dashboard, LinkSection, LinkScope, Shortcut } from '~~/shared/dashboard'

const demoLinks: Shortcut[] = [
  { id: 'home', title: 'Zuhause', url: 'https://www.home-assistant.io/', icon: 'selfhst:home-assistant', color: 'blue', position: 10 },
  { id: 'photos', title: 'Fotos', url: 'https://immich.app/', icon: 'selfhst:immich', color: 'pink', position: 20 },
  { id: 'cloud', title: 'Nextcloud', url: 'https://nextcloud.com/', icon: 'selfhst:nextcloud', color: 'blue', position: 30 },
  { id: 'media', title: 'Mediathek', url: 'https://jellyfin.org/', icon: 'selfhst:jellyfin', color: 'purple', position: 40 },
  { id: 'calendar', title: 'Kalender', url: 'https://www.icloud.com/calendar/', icon: 'calendar-days', color: 'orange', position: 50 },
  { id: 'notes', title: 'Notizen', url: 'https://www.icloud.com/notes/', icon: 'notebook-pen', color: 'green', position: 60 }
]

export default defineEventHandler(async (event): Promise<Dashboard> => {
  if (isDemo(event)) return {
    name: 'Samuel', admin: false, demo: true, nextcloud: false, pocketIdImport: false, rss: true,
    appearance: defaultAppearance, family: demoLinks, personal: [], sections: [{ id: '', scope: 'personal', title: 'Eigene Links', links: [] }, { id: '', scope: 'family', title: 'Familien-Apps', links: demoLinks }], favorites: ['home', 'photos', 'cloud'],
    pages: [{ id: 'demo-start', scope: 'personal', type: 'normal', title: 'Start', position: 0, showAll: true }],
    pageWidgets: { 'demo-start': [{ widgetId: 'weather', settings: '{}', position: 0 }, { widgetId: 'calendar', settings: '{}', position: 1 }, { widgetId: 'rss', settings: '{}', position: 2 }] }
  }
  const user = await requireMember(event)
  const connection = db(event)
  ensureDefaultPage(connection, user.id)
  const nextcloud = normalizeCloudBase(useRuntimeConfig(event).nextcloudUrl)
  if (nextcloud) seedNextcloudShortcut(connection, nextcloud)
  const list = connection.query<Shortcut & { sectionId: string }, [string]>(
    'SELECT id, title, url, icon, color, position, section_id AS sectionId FROM links WHERE owner = ? ORDER BY position, title COLLATE NOCASE, id'
  )
  function sectionsFor(owner: string, scope: LinkScope, title: string): LinkSection[] {
    const links = list.all(owner)
    const sections = connection.query<{ id: string, title: string }, [string]>(
      'SELECT id, title FROM link_sections WHERE owner = ? ORDER BY rowid'
    ).all(owner)
    return [{ id: '', title }, ...sections].map(section => ({
      ...section, scope, links: links.filter(link => link.sectionId === section.id)
    }))
  }
  const sections = [...sectionsFor(user.id, 'personal', 'Eigene Links'), ...sectionsFor('', 'family', 'Familien-Apps')]
  const favorites = connection.query<{ link_id: string }, [string]>(
    'SELECT link_id FROM favorites WHERE owner = ? ORDER BY position, rowid'
  ).all(user.id)
  const pages = readPages(connection, user.id)
  return {
    name: user.name, admin: user.admin, demo: false, nextcloud: Boolean(nextcloud),
    pocketIdImport: user.admin && Boolean(useRuntimeConfig(event).pocketIdApiKey.trim()),
    rss: resolveRssSources(event, user.id).length > 0,
    appearance: getAppearance(connection, user.id),
    sections, family: sections.filter(section => section.scope === 'family').flatMap(section => section.links),
    personal: sections.filter(section => section.scope === 'personal').flatMap(section => section.links), favorites: favorites.map(row => row.link_id),
    pages, pageWidgets: readPageWidgets(connection, pages.map(page => page.id))
  }
})
