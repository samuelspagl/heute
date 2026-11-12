<script setup lang="ts">
import type { Component } from 'vue'
import { defaultAppearance } from '~~/shared/appearance'
import {
  colors, type Shortcut, type LinkChange, type LinkScope, type LinkSection, type SectionChange,
  type Page, type PageChange, type PageType, type PageWidget, type PageWidgetChange
} from '~~/shared/dashboard'
import { widgetById } from '~/utils/widget-registry'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const otherLocale = computed(() => locale.value === 'de' ? 'en' : 'de')

function toggleLocale() {
  void navigateTo(switchLocalePath(otherLocale.value))
}

const { data: dashboard, error: loadError } = await useFetch('/api/dashboard')
if (loadError.value || !dashboard.value) {
  if (loadError.value?.statusCode === 401) await navigateTo('/auth/login', { external: true })
  else throw createError({ statusCode: 500, statusMessage: t('dashboard.loadError') })
}

const now = useState('dashboard-date', () => new Date().toISOString())
const date = computed(() => new Date(now.value))
const timeZone = 'Europe/Berlin'
const dateLabel = computed(() => new Intl.DateTimeFormat(locale.value, {
  weekday: 'long', day: 'numeric', month: 'long', timeZone
}).format(date.value))
const greeting = computed(() => {
  const hourPart = new Intl.DateTimeFormat(locale.value, { hour: 'numeric', hourCycle: 'h23', timeZone })
    .formatToParts(date.value).find(part => part.type === 'hour')
  const hour = Number(hourPart?.value)
  if (hour < 11) return t('greeting.morning')
  if (hour < 15) return t('greeting.noon')
  if (hour < 18) return t('greeting.afternoon')
  return t('greeting.evening')
})

let clockTimer: ReturnType<typeof setInterval> | undefined

function updateClock() {
  now.value = new Date().toISOString()
}

function onKeydown(event: KeyboardEvent) {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')) return
  if (editorOpen.value || sectionOpen.value || pageDialogOpen.value || widgetPickerOpen.value || searchOpen.value) return
  if (event.key === 'ArrowLeft' && activeIndex.value > 0) activeIndex.value -= 1
  else if (event.key === 'ArrowRight' && activeIndex.value < pages.value.length - 1) activeIndex.value += 1
}

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 30_000)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  clearInterval(clockTimer)
  window.removeEventListener('keydown', onKeydown)
})

const appearance = ref(dashboard.value?.appearance ?? defaultAppearance)
const overlayPreview = ref<number | null>(null)
const searchOpen = ref(false)
const editorOpen = ref(false)
const saving = ref(false)
const message = ref('')
const editorError = ref('')
const editMode = ref(false)
const editorSection = shallowRef<LinkSection>()
const editing = ref<Shortcut>()
const form = reactive({ title: '', url: '', icon: 'link', color: 'blue', position: 0 })
const sectionOpen = ref(false)
const editedSection = shallowRef<LinkSection>()
const sectionForm = reactive<{ title: string, scope: LinkScope }>({ title: '', scope: 'personal' })
const demo = useDemoLayout(dashboard.value?.favorites ?? [], Boolean(dashboard.value?.demo))
const demoPages = useDemoPages(
  { pages: dashboard.value?.pages ?? [], pageWidgets: dashboard.value?.pageWidgets ?? {} },
  Boolean(dashboard.value?.demo)
)

const pages = computed<Page[]>(() => dashboard.value?.demo ? demoPages.layout.value.pages : dashboard.value?.pages ?? [])
const pageWidgets = computed<Record<string, PageWidget[]>>(() =>
  dashboard.value?.demo ? demoPages.layout.value.pageWidgets : dashboard.value?.pageWidgets ?? {})
const activeIndex = ref(0)
const activePage = computed<Page | undefined>(() => pages.value[Math.min(activeIndex.value, pages.value.length - 1)])

watch(() => pages.value.length, (length) => {
  if (activeIndex.value > length - 1) activeIndex.value = Math.max(0, length - 1)
})

const allSections = computed(() => dashboard.value?.demo
  ? [...demo.layout.value.sections, ...dashboard.value.sections.filter(section => section.scope === 'family')]
  : dashboard.value?.sections ?? [])
const showFavorites = computed(() => Boolean(activePage.value?.showAll) || activePage.value?.scope === 'personal')
const sections = computed(() => {
  const page = activePage.value
  if (!page || page.showAll) return allSections.value
  return allSections.value.filter(section => section.scope === page.scope)
})
const favorites = computed(() => dashboard.value?.demo ? demo.layout.value.favorites : dashboard.value?.favorites ?? [])
const sources = computed(() => new Map(allSections.value.flatMap(section => section.links.map(link => [link.id, { link, section }] as const))))
const quickId = 'quick-access'
const board = computed<LinkSection[]>(() => {
  const list = sections.value
  if (!showFavorites.value) return list
  return [{
    id: quickId, title: t('dashboard.quickAccess'), scope: 'personal',
    links: favorites.value.flatMap(id => sources.value.get(id)?.link ?? [])
  }, ...list]
})

const initials = computed(() => dashboard.value?.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]?.toUpperCase()).join('') || 'H')
defineShortcuts({
  meta_k: {
    usingInput: true,
    handler: () => { searchOpen.value = !searchOpen.value }
  }
})
const colorOptions = computed<{ label: string, value: string }[]>(() =>
  colors.map(color => ({ label: t(`colors.${color}`), value: color })))
const scopeOptions = computed<{ label: string, value: LinkScope }[]>(() => [
  { label: t('scope.personal'), value: 'personal' },
  { label: t('scope.family'), value: 'family' }
])
const pageTypeOptions = computed<{ label: string, value: PageType }[]>(() => [
  { label: t('pageType.normal'), value: 'normal' },
  { label: t('pageType.widget'), value: 'widget' },
  { label: t('pageType.fullscreen'), value: 'fullscreen' }
])

interface RenderedWidget { id: string, component: Component, props: Record<string, unknown> }

function widgetsForPage(page: Page): RenderedWidget[] {
  const current = dashboard.value
  if (!current) return []
  return (pageWidgets.value[page.id] ?? [])
    .slice()
    .sort((left, right) => left.position - right.position)
    .flatMap(widget => {
      const definition = widgetById(widget.widgetId)
      if (!definition || !definition.supportedPageTypes.includes(page.type)) return []
      if (definition.available && !definition.available(current)) return []
      return [{ id: definition.id, component: definition.component, props: definition.props?.(current) ?? {} }]
    })
}

function canEdit(section: LinkSection) {
  return section.scope === 'personal' || Boolean(dashboard.value?.admin)
}

function edit(section: LinkSection, link?: Shortcut) {
  editorSection.value = section
  editing.value = link
  editorError.value = ''
  const lastPosition = section.links.at(-1)?.position ?? -1
  Object.assign(form, link ?? { title: '', url: '', icon: 'link', color: 'blue', position: Math.min(9999, lastPosition + 1) })
  editorOpen.value = true
}

function editSection(section?: LinkSection) {
  editedSection.value = section
  sectionForm.title = section?.title ?? ''
  sectionForm.scope = section?.scope ?? (activePage.value && !activePage.value.showAll ? activePage.value.scope : 'personal')
  editorError.value = ''
  sectionOpen.value = true
}

async function persist(operation: () => Promise<unknown>, dialog?: Ref<boolean>) {
  if (saving.value) return false
  saving.value = true
  message.value = ''
  editorError.value = ''
  try {
    await operation()
    if (dialog) dialog.value = false
    if (!dashboard.value?.demo) {
      try {
        dashboard.value = await $fetch('/api/dashboard')
      } catch {
        message.value = t('dashboard.savedReload')
      }
    }
    return true
  } catch (error) {
    const failure = error instanceof Error && error.message === 'Invalid URL'
      ? t('dashboard.invalidUrl')
      : t('dashboard.saveFailed')
    if (dialog) editorError.value = failure
    else message.value = failure
    return false
  } finally {
    saving.value = false
  }
}

function changeLink(change: LinkChange, dialog?: Ref<boolean>) {
  return persist(() => dashboard.value?.demo
    ? demo.changeLink(change)
    : $fetch('/api/links', { method: 'POST', body: change }), dialog)
}

async function showImportedApps(count: number) {
  const result = count === 0 ? t('imported.none') : t('imported.apps', count)
  try {
    dashboard.value = await $fetch('/api/dashboard')
    message.value = result
  } catch {
    message.value = result + ' ' + t('dashboard.savedReload')
  }
}

function submitLink(remove = false) {
  const section = editorSection.value
  if (!section) return
  if (remove && editing.value) {
    return changeLink({ scope: section.scope, action: 'remove', id: editing.value.id }, editorOpen)
  }
  return changeLink({ scope: section.scope, action: 'save', sectionId: section.id, id: editing.value?.id, link: form }, editorOpen)
}

function submitSection(remove = false) {
  const section = editedSection.value
  const change: SectionChange = remove && section
    ? { scope: section.scope, action: 'remove', id: section.id }
    : { scope: sectionForm.scope, action: 'save', id: section?.id, title: sectionForm.title }
  return persist(() => dashboard.value?.demo
    ? demo.changeSection(change)
    : $fetch('/api/sections', { method: 'POST', body: change }), sectionOpen)
}

function move(link: Shortcut, target: LinkSection, anchor?: string, after = false) {
  const source = sources.value.get(link.id)
  if (!source || link.id === anchor) return
  if (target.id === quickId) {
    return changeLink({ scope: source.section.scope, action: 'move-favorite', id: link.id, anchor, after })
  }
  return changeLink({ scope: source.section.scope, action: 'move', id: link.id, sectionId: target.id, anchor, after })
}

function actions(link: Shortcut, section: LinkSection) {
  const source = sources.value.get(link.id)
  if (!source) return []
  const favorite = favorites.value.includes(link.id)
  const items = [{
    label: favorite ? t('linkMenu.unfavorite') : t('linkMenu.favorite'),
    icon: favorite ? 'i-lucide-star-off' : 'i-lucide-star',
    onSelect: () => { void changeLink({ scope: source.section.scope, action: 'favorite', id: link.id, favorite: !favorite }) }
  }]
  if (!editMode.value || (section.id !== quickId && !canEdit(section))) return items

  const index = section.links.findIndex(item => item.id === link.id)
  const previous = section.links[index - 1]
  const next = section.links[index + 1]
  if (previous) items.push({ label: t('linkMenu.forward'), icon: 'i-lucide-arrow-up', onSelect: () => { void move(link, section, previous.id) } })
  if (next) items.push({ label: t('linkMenu.backward'), icon: 'i-lucide-arrow-down', onSelect: () => { void move(link, section, next.id, true) } })

  if (section.id !== quickId) {
    items.push({ label: t('linkMenu.edit'), icon: 'i-lucide-pencil', onSelect: () => edit(section, link) })
    for (const target of sections.value) {
      if (target.id !== section.id && target.scope === section.scope) {
        items.push({ label: t('linkMenu.moveTo', { title: target.title }), icon: 'i-lucide-folder-input', onSelect: () => { void move(link, target) } })
      }
    }
  }
  return items
}

const dragging = shallowRef<{ link: Shortcut, section: LinkSection, width: number, offsetX: number, offsetY: number }>()
const dragPoint = shallowRef<{ x: number, y: number }>()
const dropPreview = shallowRef<{ section: LinkSection, anchor?: string, after: boolean }>()

function startDrag(event: PointerEvent, bounds: DOMRect, link: Shortcut, section: LinkSection) {
  dragging.value = {
    link, section, width: bounds.width,
    offsetX: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
    offsetY: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top))
  }
}

function stopDrag() {
  dragging.value = undefined
  dragPoint.value = undefined
  dropPreview.value = undefined
}

function sectionKey(section: LinkSection) {
  return section.scope + ':' + section.id
}

function canDrop(target: LinkSection) {
  const origin = dragging.value?.section
  if (!editMode.value || !origin) return false
  if (target.id === quickId || origin.id === quickId) return target.id === origin.id
  return origin.scope === target.scope && canEdit(target)
}

function trackDrag(event: PointerEvent) {
  if (!dragging.value) return
  dragPoint.value = { x: event.clientX, y: event.clientY }
  const hit = document.elementFromPoint(event.clientX, event.clientY)
  const targetKey = hit?.closest<HTMLElement>('[data-section-key]')?.dataset.sectionKey
  const section = board.value.find(item => sectionKey(item) === targetKey)
  const tile = hit?.closest<HTMLElement>('[data-link-id]')
  const anchor = tile?.dataset.linkId
  if (!section || !canDrop(section) || anchor === dragging.value.link.id) {
    dropPreview.value = undefined
    return
  }
  const bounds = tile?.getBoundingClientRect()
  const after = Boolean(bounds && event.clientX > bounds.left + bounds.width / 2)
  dropPreview.value = { section, anchor, after }
}

function dropLink(event: PointerEvent) {
  trackDrag(event)
  const target = dropPreview.value
  if (dragging.value && target) void move(dragging.value.link, target.section, target.anchor, target.after)
}

function toggleEdit() {
  editMode.value = !editMode.value
  stopDrag()
}

async function logout() {
  try {
    await $fetch('/api/logout', { method: 'POST' })
    await navigateTo(localePath('/abgemeldet'), { external: true })
  } catch {
    message.value = t('dashboard.logoutFailed')
  }
}

const pageDialogOpen = ref(false)
const editingPage = shallowRef<Page>()
const pageForm = reactive<{ title: string, type: PageType, scope: LinkScope }>({ title: '', type: 'normal', scope: 'personal' })

function editPage(page?: Page) {
  editingPage.value = page
  pageForm.title = page?.title ?? t('pageDialog.newTitle')
  pageForm.type = page?.type ?? 'normal'
  pageForm.scope = page?.scope ?? 'personal'
  editorError.value = ''
  pageDialogOpen.value = true
}

function pageChange(change: PageChange) {
  return dashboard.value?.demo
    ? demoPages.changePage(change)
    : $fetch('/api/pages', { method: 'POST', body: change })
}

async function submitPage() {
  const page = editingPage.value
  const scope = page?.scope ?? pageForm.scope
  const knownIds = new Set(pages.value.map(item => item.id))
  const change: PageChange = { scope, action: 'save', id: page?.id, type: pageForm.type, title: pageForm.title }
  const ok = await persist(() => pageChange(change), pageDialogOpen)
  if (ok && !page) {
    const created = pages.value.find(item => !knownIds.has(item.id))
    if (created) activeIndex.value = pages.value.findIndex(item => item.id === created.id)
  }
}

async function removePage() {
  const page = activePage.value
  if (!page) return
  await persist(() => pageChange({ scope: page.scope, action: 'remove', id: page.id }))
}

function movePage(direction: -1 | 1) {
  const page = activePage.value
  if (!page) return
  const list = pages.value.filter(item => item.scope === page.scope)
  const index = list.findIndex(item => item.id === page.id)
  const target = list[index + direction]
  if (!target) return
  return persist(() => pageChange({ scope: page.scope, action: 'move', id: page.id, anchor: target.id, after: direction > 0 }))
}

const widgetPickerOpen = ref(false)
const pickerPageId = ref('')
const pickerPage = computed(() => pages.value.find(page => page.id === pickerPageId.value))
const pickerPageType = computed<PageType>(() => pickerPage.value?.type ?? 'normal')
const pickerCurrent = computed<PageWidget[]>(() => pageWidgets.value[pickerPageId.value] ?? [])

function openWidgetPicker(page: Page) {
  pickerPageId.value = page.id
  widgetPickerOpen.value = true
}

function widgetChange(change: PageWidgetChange) {
  return dashboard.value?.demo
    ? demoPages.changeWidget(change)
    : $fetch('/api/page-widgets', { method: 'POST', body: change })
}

async function addWidget(widgetId: string) {
  const page = pickerPage.value
  if (!page) return
  const existing = page.type === 'fullscreen' ? pickerCurrent.value.slice() : []
  await persist(async () => {
    for (const widget of existing) await widgetChange({ action: 'remove', pageId: page.id, widgetId: widget.widgetId })
    await widgetChange({ action: 'add', pageId: page.id, widgetId })
  })
}

function removeWidget(widgetId: string) {
  const page = pickerPage.value
  if (!page) return
  return persist(() => widgetChange({ action: 'remove', pageId: page.id, widgetId }))
}

function moveWidget(widgetId: string, delta: number) {
  const page = pickerPage.value
  if (!page) return
  const list = pickerCurrent.value.slice().sort((left, right) => left.position - right.position)
  const index = list.findIndex(widget => widget.widgetId === widgetId)
  const target = list[index + delta]
  if (!target) return
  return persist(() => widgetChange({ action: 'move', pageId: page.id, widgetId, anchor: target.widgetId, after: delta > 0 }))
}
</script>

<template>
  <div v-if="dashboard" class="shell" :class="{ 'shell--fullscreen': activePage?.type === 'fullscreen' }" :style="{
    '--shortcut-size': appearance.iconSize + 'px',
    '--shortcut-label': appearance.labelSize + 'px',
    '--widget-width': appearance.widgetWidth + 'px'
  }">
    <WallpaperBackdrop :appearance="appearance" :overlay-opacity="overlayPreview ?? appearance.overlayOpacity" />
    <main class="workspace">
      <div class="start-header">
        <div class="welcome">
          <p class="date">{{ dateLabel }}</p>
          <h1>{{ greeting }}, {{ dashboard.name }}.</h1>
        </div>
        <div class="toolbar-actions">
          <GlassSurface as="button" class="glass-control toolbar-search"
            :aria-label="t('toolbar.search')" aria-keyshortcuts="Meta+K" :title="t('toolbar.searchHint')" @click="searchOpen = true">
            <UIcon name="i-lucide-search" aria-hidden="true" />
            <span>{{ t('toolbar.search') }}</span>
          </GlassSurface>
          <GlassSurface as="button" class="glass-control toolbar-search" :aria-pressed="editMode"
            :aria-label="editMode ? t('toolbar.done') : t('toolbar.edit')" :title="editMode ? t('toolbar.done') : t('toolbar.edit')" @click="toggleEdit">
            <UIcon :name="editMode ? 'i-lucide-check' : 'i-lucide-pencil'" aria-hidden="true" />
            <span v-if="editMode">{{ t('toolbar.done') }}</span>
          </GlassSurface>
          <GlassSurface as="button" class="glass-control toolbar-search" :aria-label="otherLocale.toUpperCase()"
            :title="otherLocale.toUpperCase()" @click="toggleLocale">
            <UIcon name="i-lucide-languages" aria-hidden="true" />
            <span>{{ otherLocale.toUpperCase() }}</span>
          </GlassSurface>
          <AppearanceControls v-model="appearance" v-model:overlay-preview="overlayPreview" :demo="dashboard.demo" :name="dashboard.name"
            :initials="initials" :nextcloud="dashboard.nextcloud" :admin="dashboard.admin" @logout="logout" />
        </div>
      </div>
      <p v-if="message" class="feedback" role="alert">{{ message }}</p>

      <PageSlider :page-count="pages.length" :active-index="activeIndex" :disabled="Boolean(dragging)"
        @update:activeIndex="activeIndex = $event" v-slot="{ isVisible }">
        <div v-for="(page, index) in pages" :key="page.id" class="page-slide"
          :class="{ 'page-slide--hidden': !isVisible(index) }"
          :aria-hidden="index !== activeIndex" :inert="index !== activeIndex">
          <div v-if="page.type === 'normal'" class="dashboard-grid">
            <div class="launchpad">
              <div v-if="editMode && (page.showAll || page.scope === 'personal' || dashboard.admin)" class="layout-edit-tools">
                <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-folder-plus" @click="editSection()">{{ t('dashboard.addSection') }}</UButton>
              </div>
              <section v-for="section in board" :key="sectionKey(section)" class="link-section"
                :data-section-key="sectionKey(section)" :aria-label="section.title"
                :class="{
                  'section-drop-ready': canDrop(section),
                  'section-drop-active': dropPreview?.section === section && !dropPreview?.anchor
                }">
                <div class="section-heading">
                  <h2>{{ section.title }}</h2>
                  <div v-if="editMode && section.id !== quickId && canEdit(section)" class="section-actions">
                    <UButton v-if="section.id" color="neutral" variant="ghost" size="sm" icon="i-lucide-pencil"
                      :aria-label="t('dashboard.editSection', { title: section.title })" @click="editSection(section)" />
                    <PocketIdImport v-if="section.scope === 'family' && dashboard.pocketIdImport"
                      :section-id="section.id" :section-title="section.title" @imported="showImportedApps" />
                    <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-plus" @click="edit(section)">{{ t('dashboard.addLink') }}</UButton>
                  </div>
                </div>
                <TransitionGroup v-if="section.links.length" name="shortcut-order" tag="div" class="app-grid">
                  <div v-for="link in section.links" :key="link.id" class="shortcut-order-item">
                    <AppTile :link="link" :actions="actions(link, section)"
                    :movable="editMode && (section.id === quickId || canEdit(section))"
                    :class="{
                      'tile-dragging': dragging?.link.id === link.id && dragging.section === section,
                      'tile-insert-before': dropPreview?.section === section && dropPreview.anchor === link.id && !dropPreview.after,
                      'tile-insert-after': dropPreview?.section === section && dropPreview.anchor === link.id && dropPreview.after
                    }"
                    @drag-start="(event, bounds) => startDrag(event, bounds, link, section)"
                      @drag-move="trackDrag" @drag-end="stopDrag" @drop="dropLink" />
                  </div>
                </TransitionGroup>
                <p v-else class="empty">{{ section.id === quickId ? t('dashboard.favoriteHint') : t('dashboard.emptySection') }}</p>
              </section>
            </div>

            <aside class="widgets" :aria-label="t('dashboard.overview')">
              <div v-if="editMode" class="widgets-edit">
                <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-layout-grid" @click="openWidgetPicker(page)">{{ t('dashboard.widgetsManage') }}</UButton>
              </div>
              <component v-for="widget in widgetsForPage(page)" :key="widget.id" :is="widget.component" v-bind="widget.props" />
              <p v-if="!widgetsForPage(page).length" class="empty">{{ t('dashboard.widgetsEmpty') }}</p>
            </aside>
          </div>

          <div v-else class="widget-page">
            <div v-if="editMode" class="layout-edit-tools">
              <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-layout-grid" @click="openWidgetPicker(page)">{{ t('dashboard.widgetsManage') }}</UButton>
            </div>
            <div v-if="page.type === 'widget'" class="widget-page__grid"
              :class="{ 'widget-page__grid--empty': !widgetsForPage(page).length }">
              <component v-for="widget in widgetsForPage(page)" :key="widget.id" :is="widget.component" v-bind="widget.props" />
              <p v-if="!widgetsForPage(page).length" class="empty">{{ t('dashboard.widgetPageEmpty') }}</p>
            </div>
            <div v-else class="widget-page__full">
              <component v-for="widget in widgetsForPage(page).slice(0, 1)" :key="widget.id" :is="widget.component" v-bind="widget.props" />
              <p v-if="!widgetsForPage(page).length" class="empty">{{ t('dashboard.fullscreenEmpty') }}</p>
            </div>
          </div>
        </div>
      </PageSlider>
    </main>

    <PageIndicator :pages="pages" :active-index="activeIndex" :edit-mode="editMode"
      @select="activeIndex = $event" @create="editPage()" @edit="editPage(activePage)" @moveLeft="movePage(-1)"
      @moveRight="movePage(1)" @remove="removePage()" />

    <Teleport to="body">
      <div v-if="dragging && dragPoint" class="shortcut-drag-preview" aria-hidden="true" :style="{
        width: dragging.width + 'px',
        '--shortcut-size': appearance.iconSize + 'px',
        '--shortcut-label': appearance.labelSize + 'px',
        transform: `translate3d(${dragPoint.x - dragging.offsetX}px, ${dragPoint.y - dragging.offsetY}px, 0)`
      }">
        <div class="shortcut-drag-card">
          <ShortcutIcon :icon="dragging.link.icon" :color="dragging.link.color" />
          <span class="app-label">{{ dragging.link.title }}</span>
        </div>
      </div>
    </Teleport>

    <CloudSearch v-model:open="searchOpen" :nextcloud="dashboard.nextcloud" />
    <UModal v-model:open="editorOpen" :ui="{ content: 'glass-surface editor-glass ring-0', overlay: 'editor-glass-backdrop' }" :title="editing ? t('linkDialog.edit') : t('linkDialog.add')"
      :description="dashboard.demo ? t('linkDialog.demo') : editorSection?.scope === 'family' ? t('linkDialog.family') : t('linkDialog.personal')">
      <template #body>
        <form class="modal-stack" @submit.prevent="submitLink()">
          <UFormField :label="t('field.name')" required><UInput v-model="form.title" required maxlength="60" /></UFormField>
          <UFormField :label="t('field.url')" required><UInput v-model="form.url" required type="url" maxlength="2048" placeholder="https://…" /></UFormField>
          <IconPicker v-if="editorOpen" v-model="form.icon" />
          <div class="field-row">
            <UFormField :label="t('field.color')"><USelect v-model="form.color" :items="colorOptions" /></UFormField>
            <UFormField :label="t('field.position')"><UInputNumber v-model="form.position" :min="0" :max="9999" /></UFormField>
          </div>
          <p v-if="editorError" role="alert">{{ editorError }}</p>
          <div class="editor-buttons">
            <UButton v-if="editing" type="button" color="error" variant="ghost" :disabled="saving" @click="submitLink(true)">{{ t('action.remove') }}</UButton>
            <UButton type="submit" :loading="saving">{{ t('action.save') }}</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="sectionOpen" :ui="{ content: 'glass-surface editor-glass ring-0', overlay: 'editor-glass-backdrop' }"
      :title="editedSection ? t('sectionDialog.edit') : t('sectionDialog.add')"
      :description="t('sectionDialog.description')">
      <template #body>
        <form class="modal-stack" @submit.prevent="submitSection()">
          <UFormField :label="t('field.name')" required><UInput v-model="sectionForm.title" required maxlength="60" /></UFormField>
          <UFormField v-if="dashboard?.admin && !editedSection" :label="t('field.visibility')">
            <USelect v-model="sectionForm.scope" :items="scopeOptions" />
          </UFormField>
          <p v-if="editorError" role="alert">{{ editorError }}</p>
          <div class="editor-buttons">
            <UButton v-if="editedSection && !editedSection.links.length" type="button" color="error" variant="ghost"
              :disabled="saving" @click="submitSection(true)">{{ t('sectionDialog.delete') }}</UButton>
            <UButton type="submit" :loading="saving">{{ t('action.save') }}</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal v-model:open="pageDialogOpen" :ui="{ content: 'glass-surface editor-glass ring-0', overlay: 'editor-glass-backdrop' }"
      :title="editingPage ? t('pageDialog.edit') : t('pageDialog.add')"
      :description="editingPage ? t('pageDialog.editDescription') : t('pageDialog.addDescription')">
      <template #body>
        <form class="modal-stack" @submit.prevent="submitPage()">
          <UFormField :label="t('field.name')" required><UInput v-model="pageForm.title" required maxlength="60" /></UFormField>
          <UFormField :label="t('field.type')">
            <USelect v-model="pageForm.type" :items="pageTypeOptions" />
          </UFormField>
          <UFormField v-if="dashboard?.admin && !editingPage" :label="t('field.visibility')">
            <USelect v-model="pageForm.scope" :items="scopeOptions" />
          </UFormField>
          <p v-if="editorError" role="alert">{{ editorError }}</p>
          <div class="editor-buttons">
            <UButton type="submit" :loading="saving">{{ t('action.save') }}</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <WidgetPicker v-model:open="widgetPickerOpen" :page-type="pickerPageType" :current="pickerCurrent"
      :dashboard="dashboard" :busy="saving" @add="addWidget" @remove="removeWidget" @move="moveWidget" />
  </div>
</template>
