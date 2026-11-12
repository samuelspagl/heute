import type { Component } from 'vue'
import type { Dashboard, PageType } from '~~/shared/dashboard'
import { CalendarWidget, FullCalendarWidget, RssWidget, WeatherWidget } from '#components'

export interface WidgetDefinition {
  id: string
  labelKey: string
  icon: string
  descriptionKey: string
  supportedPageTypes: PageType[]
  component: Component
  available?: (dashboard: Dashboard) => boolean
  props?: (dashboard: Dashboard) => Record<string, unknown>
  previewProps?: Record<string, unknown>
}

export const widgetRegistry: readonly WidgetDefinition[] = [
  {
    id: 'weather',
    labelKey: 'widget.weather.label',
    icon: 'i-lucide-cloud-sun',
    descriptionKey: 'widget.weather.description',
    supportedPageTypes: ['normal', 'widget'],
    component: WeatherWidget,
    previewProps: { demo: true }
  },
  {
    id: 'calendar',
    labelKey: 'widget.calendar.label',
    icon: 'i-lucide-calendar-days',
    descriptionKey: 'widget.calendar.description',
    supportedPageTypes: ['normal', 'widget'],
    component: CalendarWidget,
    props: dashboard => ({ demo: dashboard.demo }),
    previewProps: { demo: true }
  },
  {
    id: 'calendar-full',
    labelKey: 'widget.calendarFull.label',
    icon: 'i-lucide-calendar-range',
    descriptionKey: 'widget.calendarFull.description',
    supportedPageTypes: ['fullscreen'],
    component: FullCalendarWidget,
    props: dashboard => ({ demo: dashboard.demo }),
    previewProps: { demo: true, preview: true }
  },
  {
    id: 'rss',
    labelKey: 'widget.rss.label',
    icon: 'i-lucide-newspaper',
    descriptionKey: 'widget.rss.description',
    supportedPageTypes: ['normal', 'widget'],
    component: RssWidget,
    available: dashboard => dashboard.rss,
    previewProps: { demo: true }
  }
]

export function widgetById(id: string): WidgetDefinition | undefined {
  return widgetRegistry.find(widget => widget.id === id)
}
