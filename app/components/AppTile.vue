<script setup lang="ts">
import type { Shortcut } from '~~/shared/dashboard'

const { t } = useI18n()

const props = defineProps<{
  link: Shortcut
  actions: { label: string, icon: string, onSelect: () => void }[]
  movable?: boolean
}>()

const emit = defineEmits<{
  dragStart: [event: PointerEvent, bounds: DOMRect]
  dragMove: [event: PointerEvent]
  dragEnd: []
  drop: [event: PointerEvent]
}>()

let pointer: { id: number, x: number, y: number } | undefined
let moved = false

function start(event: PointerEvent) {
  moved = false
  if (!props.movable || !event.isPrimary || event.button !== 0) return
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
  const anchor = event.currentTarget as HTMLElement
  anchor.setPointerCapture(event.pointerId)
}

function track(event: PointerEvent) {
  if (!pointer || event.pointerId !== pointer.id) return
  if (!moved) {
    if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 6) return
    moved = true
    emit('dragStart', event, (event.currentTarget as HTMLElement).getBoundingClientRect())
  }
  emit('dragMove', event)
}

function end(event: PointerEvent) {
  if (pointer?.id !== event.pointerId) return
  pointer = undefined
  if (moved && event.type === 'pointerup') emit('drop', event)
  emit('dragEnd')
}

function activate(event: MouseEvent) {
  if (moved && event.detail > 0) event.preventDefault()
  moved = false
}
</script>

<template>
  <UContextMenu :ui="{ content: 'glass-surface menu-glass ring-0' }" :items="actions" :disabled="!actions.length">
    <div class="app-tile" :class="{ 'tile-movable': movable }" :data-link-id="link.id">
      <a :href="link.url" class="app-link" :aria-label="link.title" :title="link.title"
        :draggable="movable ? false : undefined" @pointerdown="start" @pointermove="track"
        @pointerup="end" @pointercancel="end" @lostpointercapture="end" @click="activate">
        <ShortcutIcon :icon="link.icon" :color="link.color" />
        <span class="app-label">{{ link.title }}</span>
      </a>
      <UDropdownMenu v-if="actions.length" :ui="{ content: 'glass-surface menu-glass ring-0' }" :items="actions">
        <UButton class="tile-menu" color="neutral" variant="ghost" size="xs" icon="i-lucide-ellipsis" :aria-label="t('linkMenu.actionsFor', { title: link.title })" />
      </UDropdownMenu>
    </div>
  </UContextMenu>
</template>
