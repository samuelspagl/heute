import type { Appearance } from './appearance'

export interface Shortcut {
  id: string
  title: string
  url: string
  icon: string
  color: string
  position: number
}

export type LinkScope = 'family' | 'personal'
export interface LinkSection {
  id: string
  scope: LinkScope
  title: string
  links: Shortcut[]
}

export type PageType = 'normal' | 'widget' | 'fullscreen'
export const pageTypes = ['normal', 'widget', 'fullscreen'] as const

export interface Page {
  id: string
  scope: LinkScope
  type: PageType
  title: string
  position: number
  showAll: boolean
}

export interface PageWidget {
  widgetId: string
  settings: string
  position: number
}

export function insertInOrder(ids: string[], id: string, anchor?: string, after = false) {
  if (id === anchor) return ids
  const ordered = ids.filter(value => value !== id)
  const index = anchor ? ordered.indexOf(anchor) : ordered.length
  if (index < 0) return null
  ordered.splice(index + (anchor && after ? 1 : 0), 0, id)
  return ordered
}

export interface Dashboard {
  name: string
  admin: boolean
  demo: boolean
  nextcloud: boolean
  pocketIdImport: boolean
  rss: boolean
  appearance: Appearance
  family: Shortcut[]
  personal: Shortcut[]
  sections: LinkSection[]
  favorites: string[]
  pages: Page[]
  pageWidgets: Record<string, PageWidget[]>
}

export interface PocketIdApp {
  id: string
  name: string
  url: string | null
  icon: string
  status: 'available' | 'existing' | 'invalid-url' | 'invalid-name'
}

export const colors = ['blue', 'purple', 'pink', 'green', 'orange', 'slate'] as const
export const icons = ['house', 'images', 'cloud', 'play', 'calendar-days', 'notebook-pen', 'folder', 'link'] as const

export type LinkChange =
  | { scope: LinkScope, action: 'save', sectionId: string, id?: string, link: Partial<Shortcut> }
  | { scope: LinkScope, action: 'remove', id: string }
  | { scope: LinkScope, action: 'favorite', id: string, favorite: boolean }
  | { scope: LinkScope, action: 'move' | 'move-favorite', id: string, sectionId?: string, anchor?: string, after?: boolean }

export type SectionChange =
  | { scope: LinkScope, action: 'save', id?: string, title: string }
  | { scope: LinkScope, action: 'remove', id: string }

export type PageChange =
  | { scope: LinkScope, action: 'save', id?: string, type: PageType, title: string }
  | { scope: LinkScope, action: 'remove', id: string }
  | { scope: LinkScope, action: 'move', id: string, anchor?: string, after?: boolean }
  | { scope: LinkScope, action: 'set-type', id: string, type: PageType }

export type PageWidgetChange =
  | { action: 'add', pageId: string, widgetId: string }
  | { action: 'remove', pageId: string, widgetId: string }
  | { action: 'move', pageId: string, widgetId: string, anchor?: string, after?: boolean }
