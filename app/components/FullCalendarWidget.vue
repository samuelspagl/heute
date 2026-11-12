<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import deLocale from '@fullcalendar/core/locales/de'
import type { CalendarOptions, DatesSetArg, EventClickArg } from '@fullcalendar/core'
import { calendarIcons, type CalendarEvent } from '~~/shared/calendar'
import { useCalendar, type CalendarRange } from '~/composables/useCalendar'

const props = defineProps<{ demo?: boolean, preview?: boolean }>()
const { t, locale } = useI18n()
const fcLocale = computed<string | typeof deLocale>(() => locale.value === 'en' ? 'en' : deLocale)

function monthRange(date = new Date()): CalendarRange {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
  return { start: start.toISOString(), end: end.toISOString() }
}

const range = ref<CalendarRange>(monthRange())

const {
  events, calendarMeta, detailOpen, detailEvent, openDetail, eventRange, eventIcon, eventColor,
  settingsOpen, settingsLoading, settingsError, saving, saveError, availableCalendars,
  selectedIcons, groupingDraft, openSettings, isSelected, toggleCalendar, setIcon, saveSettings
} = useCalendar({ demo: props.demo, range })

const calendarRef = ref<InstanceType<typeof FullCalendar>>()
const calendarBody = ref<HTMLElement>()
let resizeObserver: ResizeObserver | undefined
let resizeFrame = 0

onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => calendarRef.value?.getApi().updateSize())
  })
  if (calendarBody.value) resizeObserver.observe(calendarBody.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(resizeFrame)
})
const viewMode = ref<'month' | 'week'>('month')
const title = ref(new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(new Date()))

const plugins = [dayGridPlugin, timeGridPlugin]

const fcEvents = computed(() => events.value.map(event => {
  const color = calendarMeta.value.get(event.calendarId)?.color ?? '#2f6fed'
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: color,
    borderColor: color,
    textColor: '#ffffff',
    extendedProps: { event }
  }
}))

function onDatesSet(info: DatesSetArg) {
  const start = info.view.currentStart
  const end = info.view.type === 'timeGridWeek'
    ? new Date(start.getTime() + 7 * 86_400_000)
    : new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59)
  const nextStart = start.toISOString()
  const nextEnd = end.toISOString()
  if (!range.value || range.value.start !== nextStart || range.value.end !== nextEnd) {
    range.value = { start: nextStart, end: nextEnd }
  }
  title.value = info.view.title
  viewMode.value = info.view.type === 'timeGridWeek' ? 'week' : 'month'
}

function api() {
  return calendarRef.value?.getApi()
}

function setView(mode: 'month' | 'week') {
  viewMode.value = mode
  api()?.changeView(mode === 'week' ? 'timeGridWeek' : 'dayGridMonth')
}

function goPrev() { api()?.prev() }
function goNext() { api()?.next() }
function goToday() { api()?.today() }

function onEventClick(info: EventClickArg) {
  const event = info.event.extendedProps.event as CalendarEvent | undefined
  if (event) openDetail(event)
}

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins,
  initialView: 'dayGridMonth',
  headerToolbar: false,
  locale: fcLocale.value,
  firstDay: 1,
  height: '100%',
  expandRows: true,
  dayMaxEvents: true,
  eventDisplay: 'block',
  nowIndicator: true,
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  events: fcEvents.value,
  datesSet: onDatesSet,
  eventClick: onEventClick
}))
</script>

<template>
  <section class="full-calendar-widget" :class="{ 'full-calendar-widget--preview': preview }" :aria-label="t('calendar.label')">
    <div v-if="!preview" class="glass-surface full-calendar-toolbar">
      <div class="fc-view-toggle">
        <button type="button" class="fc-toolbar-btn" :aria-pressed="viewMode === 'month'" @click="setView('month')">{{ t('calendar.month') }}</button>
        <button type="button" class="fc-toolbar-btn" :aria-pressed="viewMode === 'week'" @click="setView('week')">{{ t('calendar.week') }}</button>
      </div>
      <div class="fc-nav">
        <button type="button" class="fc-icon-btn" :aria-label="t('calendar.prev')" @click="goPrev">
          <UIcon name="i-lucide-chevron-left" aria-hidden="true" />
        </button>
        <span class="fc-title">{{ title }}</span>
        <button type="button" class="fc-icon-btn" :aria-label="t('calendar.next')" @click="goNext">
          <UIcon name="i-lucide-chevron-right" aria-hidden="true" />
        </button>
      </div>
      <div class="fc-toolbar-actions">
        <button type="button" class="fc-toolbar-btn" @click="goToday">{{ t('calendar.today') }}</button>
        <button type="button" class="fc-icon-btn" :aria-label="t('calendar.settings')" @click="openSettings">
          <UIcon name="i-lucide-settings" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div ref="calendarBody" class="full-calendar-body">
      <div class="glass-surface full-calendar-surface">
        <ClientOnly>
          <FullCalendar ref="calendarRef" :options="calendarOptions" />
        </ClientOnly>
      </div>
    </div>

    <UModal v-model:open="detailOpen" :ui="{ content: 'glass-surface editor-glass ring-0', overlay: 'editor-glass-backdrop' }"
      :title="detailEvent?.title ?? t('calendar.event')">
      <template #body>
        <div v-if="detailEvent" class="calendar-detail">
          <p class="calendar-detail-row"><UIcon name="i-lucide-clock" /> {{ eventRange(detailEvent) }}</p>
          <p v-if="detailEvent.location" class="calendar-detail-row"><UIcon name="i-lucide-map-pin" /> {{ detailEvent.location }}</p>
          <p v-if="detailEvent.description" class="calendar-detail-desc">{{ detailEvent.description }}</p>
          <p class="calendar-detail-row calendar-detail-source">
            <UIcon :name="eventIcon(detailEvent)" :style="{ color: eventColor(detailEvent) }" />
            {{ calendarMeta.get(detailEvent.calendarId)?.name }}
          </p>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="settingsOpen" :ui="{ content: 'glass-surface editor-glass ring-0 sm:max-w-lg', overlay: 'editor-glass-backdrop' }"
      :title="t('calendar.settings')" :description="t('calendar.settingsDescriptionCalendar')">
      <template #body>
        <div class="calendar-settings">
          <p v-if="settingsLoading" class="calendar-state" role="status">{{ t('calendar.settingsLoading') }}</p>
          <p v-else-if="settingsError" class="calendar-state" role="status">{{ t('calendar.settingsError') }}</p>
          <template v-else>
            <p v-if="availableCalendars.length === 0" class="calendar-state">{{ t('calendar.noHomeAssistant') }}</p>
            <ul v-else class="calendar-pick">
              <li v-for="calendar in availableCalendars" :key="calendar.id" class="calendar-pick-item">
                <div class="calendar-pick-row">
                  <span class="calendar-pick-color" :style="{ background: calendar.color }" aria-hidden="true" />
                  <UCheckbox :model-value="isSelected(calendar.id)" :label="calendar.name"
                    @update:model-value="value => toggleCalendar(calendar.id, Boolean(value))" />
                </div>
                <label v-if="isSelected(calendar.id)" class="calendar-pick-icon">
                  <UIcon :name="'i-lucide-' + (selectedIcons[calendar.id] || 'calendar')" :style="{ color: calendar.color }" aria-hidden="true" />
                  <select :value="selectedIcons[calendar.id] || 'calendar'" :aria-label="t('calendar.iconFor', { name: calendar.name })"
                    @change="setIcon(calendar.id, ($event.target as HTMLSelectElement).value)">
                    <option v-for="icon in calendarIcons" :key="icon" :value="icon">{{ icon }}</option>
                  </select>
                </label>
              </li>
            </ul>
            <USwitch v-model="groupingDraft" :label="t('calendar.groupByDay')" />
            <p v-if="saveError" class="calendar-state" role="status">{{ t('calendar.saveFailed') }}</p>
            <div class="calendar-settings-actions">
              <UButton color="neutral" variant="ghost" :disabled="saving" @click="settingsOpen = false">{{ t('action.cancel') }}</UButton>
              <UButton :loading="saving" :disabled="settingsLoading || settingsError" @click="saveSettings">{{ t('action.save') }}</UButton>
            </div>
          </template>
        </div>
      </template>
    </UModal>
  </section>
</template>

<style scoped>
.full-calendar-widget {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  height: 100%;
  min-height: 0;
}
.full-calendar-widget--preview { height: 180px; min-height: 0; gap: 0; }

.full-calendar-toolbar {
  display: flex;
  flex: none;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  --glass-radius: 16px;
  --glass-fill: rgb(255 255 255 / .5);
  --glass-blur-radius: 16px;
}
:global(.dark) .full-calendar-toolbar { --glass-fill: rgb(24 28 38 / .62); }
.fc-view-toggle { display: inline-flex; gap: 4px; }
.fc-toolbar-btn {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--quiet);
  cursor: pointer;
}
.fc-toolbar-btn:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 8%, transparent); }
.fc-toolbar-btn[aria-pressed="true"] { color: var(--ui-text-on-primary, #fff); background: var(--ui-primary); }
.fc-nav { display: flex; align-items: center; gap: 4px; margin-inline: auto; }
.fc-title { font-size: 14px; font-weight: 650; letter-spacing: -.01em; min-width: 10ch; text-align: center; text-transform: capitalize; }
.fc-icon-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  color: var(--quiet);
  cursor: pointer;
}
.fc-icon-btn:hover { color: var(--ink); background: color-mix(in srgb, var(--ink) 8%, transparent); }
.fc-icon-btn .iconify { width: 17px; height: 17px; }
.fc-toolbar-actions { display: flex; align-items: center; gap: 4px; }

.full-calendar-body { flex: 1; min-height: 0; }
.full-calendar-surface {
  height: 100%;
  overflow: hidden;
  padding: 0;
  border: 0;
  --glass-radius: 16px;
  --glass-fill: rgb(255 255 255 / .5);
  --glass-blur-radius: 16px;
}
:global(.dark) .full-calendar-surface { --glass-fill: rgb(24 28 38 / .62); }

.calendar-detail { display: grid; gap: 10px; }
.calendar-detail-row { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.calendar-detail-row .iconify { width: 16px; height: 16px; flex: none; color: var(--quiet); }
.calendar-detail-desc { font-size: 14px; color: var(--quiet); white-space: pre-wrap; overflow-wrap: anywhere; }
.calendar-detail-source { color: var(--quiet); font-size: 13px; }

.calendar-settings { display: grid; gap: 14px; }
.calendar-state { color: var(--quiet); font-size: 13px; }
.calendar-pick { display: grid; gap: 6px; max-height: 320px; overflow-y: auto; }
.calendar-pick-item { display: grid; gap: 6px; padding: 8px; border-radius: 10px; }
.calendar-pick-item:hover { background: var(--ui-bg-elevated); }
.calendar-pick-row { display: flex; align-items: center; gap: 10px; }
.calendar-pick-color { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.calendar-pick-icon { display: flex; align-items: center; gap: 8px; padding-left: 20px; }
.calendar-pick-icon .iconify { width: 16px; height: 16px; flex: none; }
.calendar-pick-icon select { background: var(--ui-bg); border: 1px solid var(--ui-border-accented); border-radius: 8px; padding: 3px 6px; font-size: 12px; }
.calendar-settings-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
