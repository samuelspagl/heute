<script setup lang="ts">
import { icons } from '~~/shared/dashboard'

const icon = defineModel<string>({ required: true })
const { t } = useI18n()
const iconKeys: Record<string, string> = {
  house: 'icons.house', images: 'icons.photos', cloud: 'icons.cloud', play: 'icons.media',
  'calendar-days': 'icons.calendar', 'notebook-pen': 'icons.notes', folder: 'icons.folder', link: 'icons.link'
}
const iconOptions = computed<{ label: string, value: string }[]>(() =>
  icons.map(value => ({ label: t(iconKeys[value] ?? value), value })))
const query = ref('')
const catalog = shallowRef<string[][]>([])
const failed = ref(false)
const catalogMode = ref(icon.value.startsWith('selfhst:'))
const search = computed(() => query.value.trim().toLowerCase())
const matches = computed(() => catalog.value.filter(([slug, name]) =>
  slug?.includes(search.value) || name?.toLowerCase().includes(search.value)
).slice(0, 12))
const selectedName = computed(() => catalog.value.find(([slug]) => 'selfhst:' + slug === icon.value)?.[1] ?? icon.value.slice(8))

watch(catalogMode, async (enabled) => {
  if (!enabled || catalog.value.length) return
  failed.value = false
  try {
    catalog.value = (await import('~~/shared/selfhst-index.json')).default
  } catch {
    failed.value = true
  }
}, { immediate: true })

function selectMode(value: boolean) {
  catalogMode.value = value
  if (!value && icon.value.startsWith('selfhst:')) icon.value = 'link'
}
</script>

<template>
  <fieldset class="icon-picker">
    <legend>{{ t('icons.title') }}</legend>
    <div class="icon-picker-modes">
      <UButton type="button" color="neutral" :variant="!catalogMode ? 'soft' : 'ghost'" :aria-pressed="!catalogMode" @click="selectMode(false)">{{ t('icons.symbols') }}</UButton>
      <UButton type="button" color="neutral" :variant="catalogMode ? 'soft' : 'ghost'" :aria-pressed="catalogMode" @click="selectMode(true)">{{ t('icons.selfhst') }}</UButton>
    </div>
    <div v-if="!catalogMode" class="icon-picker-symbol">
      <span>{{ t('icons.symbol') }}</span>
      <USelect v-model="icon" :items="iconOptions" :aria-label="t('icons.choose')" class="flex-1" />
    </div>
    <template v-else>
      <UInput v-model="query" :aria-label="t('icons.search')" :placeholder="t('icons.searchPlaceholder')" icon="i-lucide-search" />
      <div v-if="icon.startsWith('selfhst:')" class="icon-picker-selected">
        <ShortcutIcon :icon="icon" />
        <span>{{ t('icons.selected', { name: selectedName }) }}</span>
      </div>
      <div v-if="matches.length" class="icon-picker-grid">
        <button v-for="[slug, name] in matches" :key="slug" type="button" :aria-pressed="icon === 'selfhst:' + slug" @click="icon = 'selfhst:' + slug">
          <ShortcutIcon :icon="'selfhst:' + slug" />
          <span>{{ name }}</span>
        </button>
      </div>
      <p v-else-if="failed" role="status">{{ t('icons.loadFailed') }}</p>
      <p v-else-if="catalog.length" role="status">{{ t('icons.noResults') }}</p>
      <p v-else role="status">{{ t('icons.loading') }}</p>
      <small>Icons von <a href="https://selfh.st/icons/" target="_blank" rel="noreferrer">selfh.st</a> · <a href="https://github.com/selfhst/icons/blob/main/LICENSE" target="_blank" rel="noreferrer">CC BY 4.0</a></small>
    </template>
  </fieldset>
</template>
