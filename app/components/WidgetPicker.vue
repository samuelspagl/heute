<script setup lang="ts">
import type { Dashboard, PageType, PageWidget } from '~~/shared/dashboard'
import { widgetById, widgetRegistry } from '~/utils/widget-registry'

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

const props = defineProps<{
  pageType: PageType
  current: PageWidget[]
  dashboard?: Dashboard
  busy?: boolean
}>()

const emit = defineEmits<{
  add: [widgetId: string]
  remove: [widgetId: string]
  move: [widgetId: string, delta: number]
}>()

const currentIds = computed(() => props.current.map(widget => widget.widgetId))

const currentWidgets = computed(() => props.current
  .slice()
  .sort((left, right) => left.position - right.position)
  .flatMap(widget => {
    const definition = widgetById(widget.widgetId)
    return definition ? [definition] : []
  }))

const availableWidgets = computed(() => widgetRegistry.filter(definition =>
  !currentIds.value.includes(definition.id) &&
  definition.supportedPageTypes.includes(props.pageType) &&
  (!definition.available || (props.dashboard ? definition.available(props.dashboard) : true))
))

function move(widgetId: string, delta: number) {
  emit('move', widgetId, delta)
}
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'glass-surface editor-glass ring-0', overlay: 'editor-glass-backdrop' }"
    :title="t('widgets.title')" :description="t('widgets.description')">
    <template #body>
      <div class="widget-picker">
        <section class="widget-picker__section">
          <h3>{{ t('widgets.onPage') }}</h3>
          <p v-if="!currentWidgets.length" class="widget-picker__empty">{{ t('widgets.empty') }}</p>
          <ul v-else class="widget-picker__list">
            <li v-for="(widget, index) in currentWidgets" :key="widget.id" class="widget-picker__item">
              <span class="widget-picker__icon"><UIcon :name="widget.icon" aria-hidden="true" /></span>
              <span class="widget-picker__body">
                <strong>{{ t(widget.labelKey) }}</strong>
                <small>{{ t(widget.descriptionKey) }}</small>
              </span>
              <div class="widget-picker__actions">
                <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-arrow-up" :disabled="busy || index === 0"
                  :aria-label="t('widgets.moveForward')" @click="move(widget.id, -1)" />
                <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-arrow-down"
                  :disabled="busy || index === currentWidgets.length - 1" :aria-label="t('widgets.moveBackward')"
                  @click="move(widget.id, 1)" />
                <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x" :disabled="busy"
                  :aria-label="t('widgets.remove', { label: t(widget.labelKey) })" @click="emit('remove', widget.id)" />
              </div>
            </li>
          </ul>
        </section>

        <section class="widget-picker__section">
          <h3>{{ t('widgets.available') }}</h3>
          <p v-if="!availableWidgets.length" class="widget-picker__empty">{{ t('widgets.noneAvailable') }}</p>
          <div v-else class="widget-picker__grid">
            <div v-for="widget in availableWidgets" :key="widget.id" class="widget-picker__card">
              <WidgetPreview :widget="widget" />
              <div class="widget-picker__card-meta">
                <span class="widget-picker__icon"><UIcon :name="widget.icon" aria-hidden="true" /></span>
                <span class="widget-picker__body">
                  <strong>{{ t(widget.labelKey) }}</strong>
                  <small>{{ t(widget.descriptionKey) }}</small>
                </span>
              </div>
              <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-plus" block :disabled="busy"
                @click="emit('add', widget.id)">{{ t('widgets.add') }}</UButton>
            </div>
          </div>
        </section>
      </div>
    </template>
  </UModal>
</template>
