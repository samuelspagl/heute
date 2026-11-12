import type {
  CalendarEvent, CalendarEventInfo, CalendarInfo, CalendarResult, CalendarSettings
} from '~~/shared/calendar'

export interface CalendarRange {
  start: string
  end: string
}

export interface UseCalendarOptions {
  demo?: boolean
  range?: Ref<CalendarRange>
}

export function demoCalendarResult(nowMs: number): CalendarResult {
  const base = new Date(nowMs)
  const at = (dayOffset: number, hour: number, minute = 0) => {
    const date = new Date(base)
    date.setHours(hour, minute, 0, 0)
    date.setDate(date.getDate() + dayOffset)
    return date.toISOString()
  }
  const day = (dayOffset: number) => {
    const date = new Date(base)
    date.setDate(date.getDate() + dayOffset)
    return date.toISOString().slice(0, 10)
  }
  const calendars: CalendarEventInfo[] = [
    { id: 'calendar.family', name: 'Familie', color: '#2f6fed', icon: 'house' },
    { id: 'calendar.kids', name: 'Kinder', color: '#d6486a', icon: 'users' },
    { id: 'calendar.work', name: 'Arbeit', color: '#2f9e63', icon: 'briefcase' }
  ]
  const events: CalendarEvent[] = [
    { id: 'demo-1', calendarId: 'calendar.family', title: 'Abendessen', start: at(0, 18, 30), end: at(0, 19, 30), allDay: false },
    { id: 'demo-2', calendarId: 'calendar.kids', title: 'Schwimmen', start: at(1, 16), end: at(1, 17), allDay: false },
    { id: 'demo-3', calendarId: 'calendar.family', title: 'Wochenende im Grünen', start: day(5), end: day(7), allDay: true },
    { id: 'demo-4', calendarId: 'calendar.work', title: 'Team-Meeting', start: at(2, 10), end: at(2, 11), allDay: false },
    { id: 'demo-5', calendarId: 'calendar.family', title: 'Geburtstag Oma', start: day(9), end: day(10), allDay: true }
  ]
  return {
    enabled: true,
    configured: true,
    timezone: 'Europe/Berlin',
    range: { start: day(-15), end: day(15) },
    dayGrouping: true,
    calendars,
    events,
    partial: false,
    sources: []
  }
}

export function useCalendar(options: UseCalendarOptions = {}) {
  const demo = options.demo ?? false
  const range = options.range
  const { t, locale } = useI18n()

  const query = computed<Record<string, string>>((): Record<string, string> => {
    const value = range?.value
    if (demo || !value) return {}
    return { start: value.start, end: value.end }
  })

  const { data, status, error, pending, refresh } = useFetch<CalendarResult>('/api/calendar/events', {
    server: false,
    immediate: !demo,
    query
  })

  const now = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined
  if (import.meta.client && !demo) {
    timer = setInterval(() => { now.value = Date.now() }, 60_000)
  }
  onUnmounted(() => { if (timer) clearInterval(timer) })

  const loading = computed(() => (status.value === 'pending' || status.value === 'idle') && !demo && data.value == null)
  const failed = computed(() => !demo && (status.value === 'error' || Boolean(error.value)))
  const result = computed(() => demo ? demoCalendarResult(now.value) : data.value)
  const enabled = computed(() => result.value?.enabled === true)
  const configured = computed(() => result.value?.configured === true)
  const events = computed(() => result.value?.events ?? [])
  const timezone = computed(() => result.value?.timezone || 'Europe/Berlin')
  const dayGrouping = computed(() => result.value?.dayGrouping === true)
  const partial = computed(() => result.value?.partial === true)

  const calendarMeta = computed(() => {
    const map = new Map<string, { name: string; color: string; icon: string | null }>()
    for (const calendar of result.value?.calendars ?? []) {
      map.set(calendar.id, { name: calendar.name, color: calendar.color, icon: calendar.icon })
    }
    return map
  })

  const stale = computed(() => {
    const sources = result.value?.sources ?? []
    return sources.length > 0 && sources.every(source => source.state === 'stale')
  })

  function ymd(date: Date, tz: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
    const value = (type: string) => parts.find(part => part.type === type)?.value ?? '00'
    return `${value('year')}-${value('month')}-${value('day')}`
  }

  function addDays(key: string, days: number): string {
    const date = new Date(`${key}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
  }

  function dayLabel(key: string, today: string, tomorrow: string): string {
    if (key === today) return t('common.today')
    if (key === tomorrow) return t('common.tomorrow')
    return new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00Z`))
  }

  interface DayGroup {
    key: string
    label: string
    events: CalendarEvent[]
  }

  const dayGroups = computed<DayGroup[]>(() => {
    const groups: DayGroup[] = []
    const tz = timezone.value
    const today = ymd(new Date(now.value), tz)
    const tomorrow = addDays(today, 1)
    for (const event of events.value) {
      const key = event.allDay ? event.start : ymd(new Date(event.start), tz)
      const last = groups[groups.length - 1]
      if (last && last.key === key) last.events.push(event)
      else groups.push({ key, label: dayLabel(key, today, tomorrow), events: [event] })
    }
    return groups
  })

  const renderGroups = computed<DayGroup[]>(() => {
    if (!dayGrouping.value) return events.value.length ? [{ key: 'all', label: '', events: events.value }] : []
    return dayGroups.value
  })

  const todayKey = computed(() => ymd(new Date(now.value), timezone.value))

  function eventDayKey(event: CalendarEvent): string {
    return event.allDay ? event.start : ymd(new Date(event.start), timezone.value)
  }

  function isToday(event: CalendarEvent): boolean {
    return eventDayKey(event) === todayKey.value
  }

  function eventWeekday(event: CalendarEvent): string {
    const formatter = event.allDay
      ? new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' })
      : new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: timezone.value })
    const date = event.allDay ? new Date(`${event.start}T00:00:00Z`) : new Date(event.start)
    return formatter.format(date).replace('.', '')
  }

  function eventTime(event: CalendarEvent): string {
    if (event.allDay) return t('common.allDay')
    return new Intl.DateTimeFormat(locale.value, { timeZone: timezone.value, hour: '2-digit', minute: '2-digit' }).format(new Date(event.start))
  }

  function eventRange(event: CalendarEvent): string {
    if (event.allDay) {
      const start = new Date(`${event.start}T00:00:00Z`)
      const end = new Date(`${event.end}T00:00:00Z`)
      const days = Math.round((end.getTime() - start.getTime()) / 86_400_000)
      const fmt = new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', month: 'long' })
      if (days <= 1) return `${t('calendar.allDayPrefix')} · ${fmt.format(start)}`
      const last = new Date(end.getTime() - 86_400_000)
      return `${fmt.format(start)} – ${fmt.format(last)}`
    }
    const day = new Intl.DateTimeFormat(locale.value, { timeZone: timezone.value, weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(event.start))
    const time = (date: Date) => new Intl.DateTimeFormat(locale.value, { timeZone: timezone.value, hour: '2-digit', minute: '2-digit' }).format(date)
    return `${day} · ${time(new Date(event.start))} – ${time(new Date(event.end))}`
  }

  function isRunning(event: CalendarEvent): boolean {
    if (event.allDay) return false
    const start = Date.parse(event.start)
    const end = Date.parse(event.end)
    return start <= now.value && now.value < end
  }

  function eventIcon(event: CalendarEvent): string {
    return 'i-lucide-' + (calendarMeta.value.get(event.calendarId)?.icon ?? 'calendar')
  }

  function eventColor(event: CalendarEvent): string {
    return calendarMeta.value.get(event.calendarId)?.color ?? '#2f6fed'
  }

  const detailOpen = ref(false)
  const detailEvent = ref<CalendarEvent | null>(null)
  function openDetail(event: CalendarEvent) {
    detailEvent.value = event
    detailOpen.value = true
  }

  const settingsOpen = ref(false)
  const settingsLoading = ref(false)
  const settingsError = ref(false)
  const saving = ref(false)
  const saveError = ref(false)
  const availableCalendars = ref<CalendarInfo[]>([])
  const selection = ref<string[]>([])
  const selectedIcons = ref<Record<string, string>>({})
  const groupingDraft = ref(true)

  async function openSettings() {
    settingsOpen.value = true
    settingsLoading.value = true
    settingsError.value = false
    saveError.value = false
    try {
      const settings = await $fetch<CalendarSettings>('/api/calendar/settings')
      availableCalendars.value = settings.calendars
      selection.value = [...settings.selection]
      selectedIcons.value = { ...settings.icons }
      groupingDraft.value = settings.dayGrouping
    } catch {
      settingsError.value = true
    } finally {
      settingsLoading.value = false
    }
  }

  function isSelected(id: string): boolean {
    return selection.value.includes(id)
  }

  function toggleCalendar(id: string, checked: boolean) {
    if (checked) {
      if (!selection.value.includes(id)) selection.value = [...selection.value, id]
      return
    }
    selection.value = selection.value.filter(value => value !== id)
    const next = { ...selectedIcons.value }
    delete next[id]
    selectedIcons.value = next
  }

  function setIcon(id: string, icon: string) {
    selectedIcons.value = { ...selectedIcons.value, [id]: icon }
  }

  async function saveSettings() {
    saving.value = true
    saveError.value = false
    try {
      const icons = Object.fromEntries(
        Object.entries(selectedIcons.value).filter(([id]) => selection.value.includes(id))
      )
      await $fetch('/api/calendar/settings', {
        method: 'PUT',
        body: { selection: selection.value, icons, dayGrouping: groupingDraft.value }
      })
      settingsOpen.value = false
      await refresh()
    } catch {
      saveError.value = true
    } finally {
      saving.value = false
    }
  }

  return {
    now, loading, failed, result, enabled, configured, events, timezone, dayGrouping, partial,
    calendarMeta, stale, refresh, renderGroups, isToday, eventWeekday, eventTime, eventRange, isRunning,
    eventIcon, eventColor, detailOpen, detailEvent, openDetail,
    settingsOpen, settingsLoading, settingsError, saving, saveError, availableCalendars,
    selection, selectedIcons, groupingDraft, openSettings, isSelected, toggleCalendar, setIcon, saveSettings
  }
}
