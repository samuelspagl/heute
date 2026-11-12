<script setup lang="ts">
import { calendarIcons } from '~~/shared/calendar'
import { useCalendar } from '~/composables/useCalendar'

const props = defineProps<{ demo: boolean }>()
const { t } = useI18n()

const {
  loading, failed, enabled, configured, events, dayGrouping, partial, refresh,
  calendarMeta, stale, renderGroups, isToday, eventWeekday, eventTime, eventRange, isRunning,
  eventIcon, eventColor, detailOpen, detailEvent, openDetail,
  settingsOpen, settingsLoading, settingsError, saving, saveError, availableCalendars,
  selectedIcons, groupingDraft, openSettings, isSelected, toggleCalendar, setIcon, saveSettings
} = useCalendar({ demo: props.demo })
</script>

<template>
  <section class="widget agenda calendar-widget" aria-labelledby="agenda-heading">
    <div class="agenda-head">
      <h2 id="agenda-heading"><UIcon name="i-lucide-calendar-days" /> {{ t('calendar.family') }}</h2>
      <button v-if="!demo && enabled" type="button" class="calendar-gear" :aria-label="t('calendar.settings')" @click="openSettings">
        <UIcon name="i-lucide-settings" />
      </button>
      <a v-else href="https://www.icloud.com/calendar/" :aria-label="t('calendar.openIcloud')"><UIcon name="i-lucide-arrow-up-right" /></a>
    </div>

    <ul v-if="demo" class="agenda-list">
      <li><strong>Abendessen</strong><small>Heute · 18:30 Uhr</small></li>
      <li><strong>Schwimmen</strong><small>Morgen · 16:00 Uhr</small></li>
    </ul>

    <template v-else>
      <p v-if="failed" class="calendar-state" role="status">
        {{ t('calendar.unavailable') }}
        <button type="button" class="calendar-retry" @click="refresh()">{{ t('calendar.retry') }}</button>
      </p>

      <p v-else-if="loading" class="calendar-state" role="status">{{ t('calendar.loading') }}</p>

      <p v-else-if="!enabled" class="calendar-state">{{ t('calendar.openIcloudHint') }}</p>

      <div v-else-if="!configured" class="calendar-state">
        <p>{{ t('calendar.noneSelected') }}</p>
        <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-settings" @click="openSettings">{{ t('calendar.selectCalendars') }}</UButton>
      </div>

      <p v-else-if="events.length === 0" class="calendar-state" role="status">{{ t('calendar.noEvents') }}</p>

      <template v-else>
        <div class="calendar-days">
          <section v-for="group in renderGroups" :key="group.key" class="calendar-day">
            <h3 v-if="group.label" class="calendar-day-label">{{ group.label }}</h3>
            <ul class="calendar-events">
              <li v-for="event in group.events" :key="event.id">
                <button type="button" class="calendar-event" :aria-label="event.title + ', ' + eventRange(event)" @click="openDetail(event)">
                  <span class="calendar-event-time">
                    <span class="calendar-event-marker" aria-hidden="true">
                      <span v-if="isToday(event)" class="calendar-today-dot" :title="t('calendar.today')" />
                      <span v-else-if="!dayGrouping && !event.allDay" class="calendar-event-weekday">{{ eventWeekday(event) }}</span>
                    </span>
                    <span class="calendar-event-clock">{{ eventTime(event) }}</span>
                  </span>
                  <span class="calendar-event-body">
                    <span class="calendar-event-title">
                      <UIcon :name="eventIcon(event)" class="calendar-event-icon" :style="{ color: eventColor(event) }" aria-hidden="true" />
                      <span class="calendar-event-name">{{ event.title }}</span>
                      <span v-if="isRunning(event)" class="calendar-running">{{ t('calendar.running') }}</span>
                    </span>
                    <span v-if="event.location" class="calendar-event-location"><UIcon name="i-lucide-map-pin" /> {{ event.location }}</span>
                  </span>
                </button>
              </li>
            </ul>
          </section>
        </div>

        <p v-if="partial || stale" class="calendar-notice" role="status">
          {{ partial ? t('calendar.partial') : '' }}{{ stale ? t('calendar.stale') : '' }}
        </p>
      </template>
    </template>

    <UModal v-model:open="detailOpen" :ui="{ content: 'glass-surface editor-glass ring-0', overlay: 'editor-glass-backdrop' }" :title="detailEvent?.title ?? t('calendar.event')">
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

    <UModal v-model:open="settingsOpen" :ui="{ content: 'glass-surface editor-glass ring-0 sm:max-w-lg', overlay: 'editor-glass-backdrop' }" :title="t('calendar.settings')" :description="t('calendar.settingsDescriptionWidget')">
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
                  <UCheckbox
                    :model-value="isSelected(calendar.id)"
                    :label="calendar.name"
                    @update:model-value="value => toggleCalendar(calendar.id, Boolean(value))"
                  />
                </div>
                <label v-if="isSelected(calendar.id)" class="calendar-pick-icon">
                  <UIcon :name="'i-lucide-' + (selectedIcons[calendar.id] || 'calendar')" :style="{ color: calendar.color }" aria-hidden="true" />
                  <select
                    :value="selectedIcons[calendar.id] || 'calendar'"
                    :aria-label="t('calendar.iconFor', { name: calendar.name })"
                    @change="setIcon(calendar.id, ($event.target as HTMLSelectElement).value)"
                  >
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
.calendar-widget { min-width: 0; }
.calendar-gear { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 10px; color: var(--quiet); cursor: pointer; }
.calendar-gear:hover, .calendar-gear:focus-visible { color: var(--ink); background: var(--ui-bg-elevated); }

.calendar-days { margin-top: 4px; display: grid; }
.calendar-day + .calendar-day { margin-top: 4px; }
.calendar-day-label { font-size: 11px; font-weight: 650; text-transform: uppercase; letter-spacing: .05em; color: var(--quiet); margin: 10px 0 2px; }
.calendar-events { display: grid; gap: 1px; }

.calendar-event {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 10px;
  text-align: left;
  padding: 6px 8px;
  margin-inline: -8px;
  border-radius: 10px;
  cursor: pointer;
}
.calendar-event:hover, .calendar-event:focus-visible { background: var(--ui-bg-elevated); }
.calendar-event-time { display: flex; align-items: center; gap: 4px; white-space: nowrap; color: var(--quiet); font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
.calendar-event-marker { display: inline-flex; align-items: center; justify-content: center; width: 16px; flex: none; }
.calendar-event-weekday { font-size: 11px; font-weight: 650; text-transform: uppercase; letter-spacing: .03em; opacity: .85; }
.calendar-today-dot { width: 6px; height: 6px; border-radius: 50%; background: #d6486a; }
.dark .calendar-today-dot { background: #fa8295; }
.calendar-event-body { min-width: 0; display: grid; gap: 2px; }
.calendar-event-title { display: flex; align-items: center; gap: 6px; min-width: 0; }
.calendar-event-icon { width: 14px; height: 14px; flex: none; }
.calendar-event-name { font-size: 13px; font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.calendar-running { flex: none; font-size: 10px; font-weight: 650; color: #2f7d4f; background: #2f7d4f1f; padding: 1px 6px; border-radius: 6px; white-space: nowrap; }
.dark .calendar-running { color: #8ee0ac; background: #2f7d4f33; }
.calendar-event-location { display: flex; align-items: center; gap: 4px; color: var(--quiet); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.calendar-event-location .iconify { width: 12px; height: 12px; flex: none; }

.calendar-state { margin-top: 8px; }
.calendar-state p { margin-bottom: 8px; }
.calendar-retry { margin-left: 4px; text-decoration: underline; color: var(--quiet); cursor: pointer; }
.calendar-retry:hover, .calendar-retry:focus-visible { text-decoration-thickness: 2px; }
.calendar-notice { color: var(--quiet); font-size: 12px; margin-top: 8px; }

.calendar-detail { display: grid; gap: 10px; }
.calendar-detail-row { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.calendar-detail-row .iconify { width: 16px; height: 16px; flex: none; color: var(--quiet); }
.calendar-detail-desc { font-size: 14px; color: var(--quiet); white-space: pre-wrap; overflow-wrap: anywhere; }
.calendar-detail-source { color: var(--quiet); font-size: 13px; }

.calendar-settings { display: grid; gap: 14px; }
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
