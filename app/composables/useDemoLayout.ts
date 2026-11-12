import { insertInOrder, type LinkChange, type LinkSection, type SectionChange, type Shortcut } from '~~/shared/dashboard'

const storageKey = 'heute:demo-layout'
const defaultSection: LinkSection = { id: '', scope: 'personal', title: 'Eigene Links', links: [] }

export function useDemoLayout(defaultFavorites: string[], enabled: boolean) {
  const layout = ref({ sections: [defaultSection], favorites: [...defaultFavorites] })

  async function load() {
    try {
      const { parseShortcut } = await import('~~/shared/shortcut-input')
      const saved = sessionStorage.getItem(storageKey)
      const previous = saved ? JSON.parse(saved) : null
      const legacyLinks = previous ? [] : JSON.parse(sessionStorage.getItem('heute:demo-links') ?? '[]')
      function validLinks(value: unknown): Shortcut[] {
        if (!Array.isArray(value)) return []
        return value.flatMap(item => {
          if (!item || typeof item.id !== 'string' || !item.id.startsWith('demo-')) return []
          const { link } = parseShortcut(item)
          return link ? [{ ...link, id: item.id }] : []
        })
      }
      const legacy = validLinks(legacyLinks)
      const storedSections: LinkSection[] = Array.isArray(previous?.sections)
        ? previous.sections.flatMap((section: LinkSection | null) =>
          section && typeof section.id === 'string' && typeof section.title === 'string'
            ? [{ ...section, scope: 'personal', links: validLinks(section.links) }]
            : [])
        : []
      layout.value = {
        sections: [
          { ...defaultSection, links: storedSections.find(section => !section.id)?.links ?? legacy },
          ...storedSections.filter(section => section.id)
        ],
        favorites: Array.isArray(previous?.favorites)
          ? previous.favorites.filter((id: unknown) => typeof id === 'string')
          : [...defaultFavorites, ...legacy.map(link => link.id)]
      }
    } catch {
      // Invalid or unavailable tab storage starts with the demo defaults.
    }
  }

  let ready: Promise<void> | undefined
  onMounted(() => { if (enabled) ready = load() })

  function save(sections: LinkSection[], favorites: string[]) {
    const next = { sections, favorites }
    sessionStorage.setItem(storageKey, JSON.stringify(next))
    layout.value = next
  }

  async function changeSection(change: SectionChange) {
    await ready
    if (change.scope !== 'personal') throw new Error('Section is read-only')
    const { sections, favorites } = layout.value
    const existing = sections.find(section => section.id === change.id)
    if (change.action === 'remove') {
      if (!existing?.id || existing.links.length) throw new Error('Section is not removable')
      save(sections.filter(section => section !== existing), favorites)
      return
    }
    const title = change.title.trim()
    if (!title || title.length > 60) throw new Error('Invalid section name')
    save(existing
      ? sections.map(section => section === existing ? { ...section, title } : section)
      : [...sections, { id: crypto.randomUUID(), scope: 'personal', title, links: [] }], favorites)
  }

  async function changeLink(change: LinkChange) {
    await ready
    const { sections, favorites } = layout.value
    if (change.action === 'favorite') {
      const ordered = change.favorite ? [...new Set([...favorites, change.id])] : favorites.filter(id => id !== change.id)
      save(sections, ordered)
      return
    }
    if (change.action === 'move-favorite') {
      const ordered = favorites.includes(change.id) && insertInOrder(favorites, change.id, change.anchor, change.after)
      if (!ordered) throw new Error('Invalid favorite position')
      save(sections, ordered)
      return
    }
    if (change.scope !== 'personal') throw new Error('Section is read-only')
    const origin = sections.find(section => section.links.some(link => link.id === change.id))
    if (change.id && !origin) throw new Error('Link not found')
    if (change.action === 'remove') {
      save(sections.map(section => ({ ...section, links: section.links.filter(link => link.id !== change.id) })),
        favorites.filter(id => id !== change.id))
      return
    }
    const target = sections.find(section => section.id === change.sectionId)
    if (!target) throw new Error('Section not found')
    let links: Shortcut[]
    if (change.action === 'move') {
      const moving = origin?.links.find(link => link.id === change.id)
      const ordered = insertInOrder(target.links.map(link => link.id), change.id, change.anchor, change.after)
      if (!moving || !ordered) throw new Error('Invalid link position')
      const byId = new Map([...target.links, moving].map(link => [link.id, link]))
      links = ordered.map((id, position) => ({ ...byId.get(id)!, position }))
    } else if (change.action === 'save') {
      const { parseShortcut } = await import('~~/shared/shortcut-input')
      const parsed = parseShortcut(change.link)
      if (!parsed.link) throw new Error(parsed.error)
      links = [...target.links.filter(link => link.id !== change.id),
        { ...parsed.link, id: change.id ?? 'demo-' + crypto.randomUUID() }]
        .sort((left, right) => left.position - right.position || left.title.localeCompare(right.title, 'de'))
    } else {
      throw new Error('Invalid link action')
    }
    save(sections.map(section => {
      if (section === target) return { ...section, links }
      if (section === origin) return { ...section, links: section.links.filter(link => link.id !== change.id) }
      return section
    }), favorites)
  }

  return { layout, changeSection, changeLink }
}
