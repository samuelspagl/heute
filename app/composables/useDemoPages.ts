import {
  insertInOrder, type Page, type PageChange, type PageType, type PageWidget, type PageWidgetChange
} from '~~/shared/dashboard'

const storageKey = 'heute:demo-pages'

interface DemoPagesState {
  pages: Page[]
  pageWidgets: Record<string, PageWidget[]>
}

export function useDemoPages(initial: DemoPagesState, enabled: boolean) {
  const layout = ref<DemoPagesState>({
    pages: [...initial.pages],
    pageWidgets: JSON.parse(JSON.stringify(initial.pageWidgets))
  })

  function save(next: DemoPagesState) {
    sessionStorage.setItem(storageKey, JSON.stringify(next))
    layout.value = next
  }

  let ready: Promise<void> | undefined
  onMounted(() => {
    if (!enabled) return
    ready = Promise.resolve().then(() => {
      try {
        const saved = sessionStorage.getItem(storageKey)
        if (!saved) return
        const parsed = JSON.parse(saved) as DemoPagesState
        if (!Array.isArray(parsed.pages)) return
        layout.value = {
          pages: parsed.pages.filter(page => page && typeof page.id === 'string'),
          pageWidgets: parsed.pageWidgets && typeof parsed.pageWidgets === 'object' ? parsed.pageWidgets : {}
        }
      } catch {
        // Invalid tab storage keeps the provided defaults.
      }
    })
  })

  async function changePage(change: PageChange) {
    await ready
    const { pages, pageWidgets } = layout.value
    if (change.scope !== 'personal') throw new Error('Page is read-only')
    if (change.action === 'remove') {
      if (pages.length <= 1) throw new Error('The last page cannot be removed')
      const nextWidgets = { ...pageWidgets }
      delete nextWidgets[change.id]
      save({ pages: pages.filter(page => page.id !== change.id), pageWidgets: nextWidgets })
      return
    }
    if (change.action === 'move') {
      const ids = pages.map(page => page.id)
      const ordered = ids.includes(change.id) && insertInOrder(ids, change.id, change.anchor, change.after)
      if (!ordered) throw new Error('Invalid page position')
      const byId = new Map(pages.map(page => [page.id, page]))
      save({
        pages: ordered.map((id, position) => ({ ...byId.get(id)!, position })),
        pageWidgets
      })
      return
    }
    if (change.action === 'set-type') {
      save({ pages: pages.map(page => page.id === change.id ? { ...page, type: change.type } : page), pageWidgets })
      return
    }
    const title = change.title.trim()
    if (!title || title.length > 60) throw new Error('Invalid page name')
    if (change.id) {
      save({
        pages: pages.map(page => page.id === change.id ? { ...page, title, type: change.type } : page),
        pageWidgets
      })
      return
    }
    const page: Page = {
      id: 'demo-page-' + crypto.randomUUID(),
      scope: 'personal',
      type: change.type as PageType,
      title,
      position: pages.length,
      showAll: false
    }
    save({ pages: [...pages, page], pageWidgets: { ...pageWidgets, [page.id]: [] } })
  }

  async function changeWidget(change: PageWidgetChange) {
    await ready
    const { pages, pageWidgets } = layout.value
    const page = pages.find(item => item.id === change.pageId)
    if (!page) throw new Error('Page not found')
    if (page.scope !== 'personal') throw new Error('Page is read-only')
    const current = pageWidgets[change.pageId] ?? []
    if (change.action === 'add') {
      if (current.some(widget => widget.widgetId === change.widgetId)) return
      save({
        pages,
        pageWidgets: {
          ...pageWidgets,
          [change.pageId]: [...current, { widgetId: change.widgetId, settings: '{}', position: current.length }]
        }
      })
      return
    }
    if (change.action === 'remove') {
      save({
        pages,
        pageWidgets: {
          ...pageWidgets,
          [change.pageId]: current.filter(widget => widget.widgetId !== change.widgetId)
        }
      })
      return
    }
    const ids = current.map(widget => widget.widgetId)
    const ordered = ids.includes(change.widgetId) && insertInOrder(ids, change.widgetId, change.anchor, change.after)
    if (!ordered) throw new Error('Invalid widget position')
    const byId = new Map(current.map(widget => [widget.widgetId, widget]))
    save({
      pages,
      pageWidgets: {
        ...pageWidgets,
        [change.pageId]: ordered.map((widgetId, position) => ({ ...byId.get(widgetId)!, position }))
      }
    })
  }

  return { layout, changePage, changeWidget }
}
