<script setup lang="ts">
import type { RssResult } from '~~/shared/rss'

const props = defineProps<{ demo?: boolean }>()
const { t } = useI18n()

const sampleRss: RssResult = {
  failed: false,
  entries: [
    { title: 'Neue Ideen für die Familienstartseite', summary: 'Eine Auswahl kleiner Verbesserungen für den gemeinsamen Alltag.', url: 'https://example.org/neuigkeiten', publishedAt: null },
    { title: 'Ein Wochenende im Grünen', summary: 'Drei Ausflugsideen für die ganze Familie und für jedes Wetter.', url: 'https://example.org/ausfluege', publishedAt: null }
  ]
}

const { data, status } = useFetch<RssResult>('/api/rss', { server: false, immediate: !props.demo })
const rss = computed(() => props.demo ? sampleRss : data.value)
</script>

<template>
  <section class="widget rss-widget" aria-labelledby="rss-heading">
    <div class="agenda-head">
      <h2 id="rss-heading"><UIcon name="i-lucide-rss" /> {{ t('rss.title') }}</h2>
    </div>
    <ul v-if="rss?.entries.length" class="rss-list">
      <li v-for="entry in rss.entries" :key="entry.url">
        <a :href="entry.url" :title="entry.title" target="_blank" rel="noopener noreferrer">{{ entry.title }}</a>
        <p v-if="entry.summary">{{ entry.summary }}</p>
      </li>
    </ul>
    <p v-else class="rss-state" role="status">
      {{ status === 'pending' || status === 'idle' ? t('rss.loading')
        : status === 'error' || rss?.failed ? t('rss.unavailable')
          : t('rss.empty') }}
    </p>
  </section>
</template>

<style scoped>
.rss-widget { min-width: 0; padding: 17px 21px; }
.rss-widget h2 .iconify { color: var(--ui-text-highlighted); }
.rss-list { display: grid; gap: 9px; margin-top: 9px; }
.rss-list li { min-width: 0; }
.rss-list li + li { border-top: 1px solid var(--surface-line); padding-top: 9px; }
.rss-list a { display: block; font-size: 13px; font-weight: 650; }
.rss-list a:hover, .rss-list a:focus-visible { text-decoration: underline; }
.rss-list p, .rss-state { color: var(--quiet); font-size: 13px; }
.rss-list a, .rss-list p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rss-state { margin-top: 8px; }
</style>
