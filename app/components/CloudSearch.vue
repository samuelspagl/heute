<script setup lang="ts">
const props = defineProps<{ nextcloud: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const { t } = useI18n()
const term = ref('')
const result = ref<{ connected: boolean, limited: boolean, files: { title: string, detail: string, url: string }[] }>()
const palette = useTemplateRef<HTMLElement>('palette')
const inputOptions = computed(() => ({
  maxlength: 120,
  autocomplete: 'off',
  'aria-label': t('cloud.ariaLabel'),
  'aria-describedby': 'cloud-search-hint'
}))
const loading = ref(false)
const searching = ref(false)
const message = ref('')
const login = ref('')
const searched = ref(false)
const query = computed(() => term.value.trim())
const providers = [
  { id: 'nextcloud', label: 'Nextcloud', icon: 'i-lucide-cloud' },
  { id: 'google', label: 'Google', icon: 'i-lucide-globe' }
] as const
const provider = ref<typeof providers[number]>()
const searchFiles = computed(() => props.nextcloud && provider.value?.id !== 'google')
const groups = computed(() => [{
  id: 'providers',
  ignoreFilter: true,
  items: !query.value && !provider.value
    ? providers.filter(option => option.id !== 'nextcloud' || props.nextcloud).map(option => ({
        id: 'provider-' + option.id,
        label: t('cloud.searchOnly', { label: option.label }),
        providerIcon: option.icon,
        onSelect: () => setProvider(option)
      }))
    : []
}, {
  id: 'files',
  ignoreFilter: true,
  items: (!searchFiles.value || searching.value || message.value ? [] : result.value?.files ?? []).map(file => ({
    id: 'file-' + file.url, label: file.title, description: file.detail, pdf: /\.pdf$/i.test(file.title), to: file.url,
    target: '_blank' as const, rel: 'noopener noreferrer'
  }))
}, {
  id: 'web',
  ignoreFilter: true,
  items: query.value && provider.value?.id !== 'nextcloud' ? [{
    id: 'google-search',
    label: t('cloud.searchGoogle'),
    description: query.value,
    to: 'https://www.google.com/search?' + new URLSearchParams({ q: query.value }),
    target: '_blank' as const,
    rel: 'noopener noreferrer',
    slot: 'web'
  }] : []
}])
let timer: ReturnType<typeof setTimeout> | undefined
let pending: AbortController | undefined

function cloudError(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 503) {
    result.value = undefined
    return t('cloud.serverNotConfigured')
  }
  return fallback
}

function cancelSearch() {
  clearTimeout(timer)
  pending?.abort()
  pending = undefined
  searching.value = false
}

async function search(checkConnection = false) {
  cancelSearch()
  const q = query.value
  if (!searchFiles.value || !open.value || loading.value || (!checkConnection && q.length < 2)) return
  const request = new AbortController()
  pending = request
  const shouldFocus = checkConnection && !result.value?.connected
  searching.value = true
  searched.value = false
  message.value = ''
  try {
    const response = await $fetch('/api/nextcloud/search', { query: { q }, signal: request.signal })
    if (pending !== request) return
    result.value = response
    if (response.connected && q !== query.value) {
      queueFileSearch()
      return
    }
    searched.value = q.length >= 2
    if (shouldFocus && response.connected) {
      await nextTick()
      if (pending === request && open.value) palette.value?.querySelector('input')?.focus()
    }
  } catch (error) {
    if (pending === request) message.value = cloudError(error, t('cloud.searchUnavailable'))
  } finally {
    if (pending === request) {
      pending = undefined
      searching.value = false
    }
  }
}

function queueFileSearch() {
  if (!searchFiles.value || !open.value || !result.value?.connected || loading.value) return
  cancelSearch()
  result.value = { connected: true, files: [], limited: false }
  searched.value = false
  message.value = ''
  if (query.value.length >= 2) {
    searching.value = true
    timer = setTimeout(() => void search(), 300)
  }
}

watch(query, queueFileSearch, { flush: 'sync' })

function setProvider(option?: typeof providers[number]) {
  const previouslySearchedFiles = searchFiles.value
  provider.value = option
  if (!searchFiles.value) {
    cancelSearch()
    message.value = ''
  } else if (!previouslySearchedFiles && !login.value) {
    result.value = undefined
    void search(true)
  }
  void nextTick(() => palette.value?.querySelector('input')?.focus())
}

function clearProviderOnBackspace(event: KeyboardEvent) {
  if (!provider.value || term.value || event.repeat || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return
  event.preventDefault()
  event.stopPropagation()
  setProvider()
}

async function connect() {
  if (loading.value) return
  loading.value = true
  message.value = ''
  try {
    const response = await $fetch('/api/nextcloud/connect', { method: 'POST' })
    login.value = response.login
  } catch (error) {
    message.value = cloudError(error, t('cloud.connectFailed'))
  } finally {
    loading.value = false
  }
}

async function finish() {
  if (loading.value) return
  loading.value = true
  message.value = ''
  try {
    const { connected } = await $fetch('/api/nextcloud/poll', { method: 'POST' })
    if (connected) {
      login.value = ''
    }
    else message.value = t('cloud.confirmFirst')
  } catch (error) {
    login.value = ''
    message.value = cloudError(error, t('cloud.finishFailed'))
  } finally {
    loading.value = false
  }
  if (!login.value && !message.value) await search(true)
}

function submitPending(event: KeyboardEvent) {
  if (event.isComposing || !searching.value || pending || query.value.length < 2) return
  event.preventDefault()
  event.stopPropagation()
  void search()
}

watch(open, (visible) => {
  if (!visible) cancelSearch()
  else {
    provider.value = undefined
    if (!login.value) result.value = undefined
    term.value = ''
    message.value = ''
    searched.value = false
    if (!login.value) void search(true)
  }
}, { flush: 'sync' })
onBeforeUnmount(cancelSearch)
</script>

<template>
  <UModal v-model:open="open" :title="t('cloud.title')" :description="t('cloud.description')"
    :ui="{ content: 'glass-surface editor-glass spotlight-glass ring-0', overlay: 'editor-glass-backdrop' }">
    <template #content>
      <div ref="palette" :class="{ 'spotlight-filtered': provider }"
        @keydown.enter.capture="submitPending" @keydown.backspace.capture="clearProviderOnBackspace">
        <UCommandPalette v-model:search-term="term" :groups="groups" :loading="searching" autofocus size="xl"
          value-key="id" :placeholder="provider ? t('cloud.placeholderIn', { label: provider.label }) : t('cloud.placeholder')"
          :input="inputOptions"
          :ui="{ root: 'divide-y-0', input: 'spotlight-input', viewport: 'spotlight-results', empty: 'spotlight-status', item: 'min-h-16 items-center gap-3 px-3' }">
          <template #empty><span hidden /></template>
          <template v-if="provider" #close>
            <button type="button" class="spotlight-provider" :aria-label="t('cloud.removeFilter', { label: provider.label })"
              :title="t('cloud.removeFilter', { label: provider.label })" @click="setProvider()">
              <UIcon :name="provider.icon" class="provider-icon" aria-hidden="true" />
              <UIcon name="i-lucide-x" class="provider-remove" aria-hidden="true" />
            </button>
          </template>
          <template #web-leading>
            <span class="spotlight-file-icon" aria-hidden="true"><UIcon name="i-lucide-globe" class="size-6" /></span>
          </template>
          <template #web-trailing><UIcon name="i-lucide-arrow-up-right" aria-hidden="true" /></template>
          <template #item-leading="{ item }">
            <span class="spotlight-file-icon" aria-hidden="true">
              <svg v-if="'pdf' in item && item.pdf" viewBox="0 0 28 28" width="28" height="28" fill="none">
                <path d="M7 2.5h9l6 6V24a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 6 24V4a1.5 1.5 0 0 1 1-1.5ZM16 3v5.5h5.5"
                  stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
                <text x="14" y="18.5" text-anchor="middle" fill="currentColor" font-size="7" font-weight="700">PDF</text>
              </svg>
              <UIcon v-else :name="'providerIcon' in item && typeof item.providerIcon === 'string' ? item.providerIcon : 'i-lucide-file'" class="size-6" />
            </span>
          </template>
          <template #item-trailing="{ item }"><UIcon :name="'providerIcon' in item ? 'i-lucide-arrow-right' : 'i-lucide-arrow-up-right'" aria-hidden="true" /></template>
        </UCommandPalette>
        <footer class="spotlight-footer cloud-hint">
          <p v-if="searchFiles && message" role="alert">{{ message }}</p>
          <p v-else-if="searching" role="status">{{ result?.connected ? t('cloud.searching') : t('cloud.checking') }}</p>
          <p v-else-if="searchFiles && result?.limited" role="status">{{ t('cloud.moreResults') }}</p>
          <p v-else-if="searchFiles && searched && result?.connected && !result.files.length" role="status">{{ t('cloud.noFiles') }}</p>
          <p id="cloud-search-hint">
            {{ searchFiles && result?.connected ? t('cloud.filterHint')
              : provider?.id === 'nextcloud' ? t('cloud.connectHint')
                : t('cloud.googleHint') }}
          </p>
        </footer>
      </div>
      <section v-if="searchFiles && result && !result.connected && !searching && (!query || login || provider?.id === 'nextcloud')" class="cloud-setup">
        <ShortcutIcon icon="selfhst:nextcloud" color="blue" />
        <div>
          <h2>{{ login ? t('cloud.confirmTitle') : t('cloud.connectTitle') }}</h2>
          <p>{{ login ? t('cloud.confirmText')
            : t('cloud.connectText') }}</p>
        </div>
        <UButton v-if="!login" :loading="loading" icon="i-lucide-cloud" @click="connect">{{ t('cloud.connectButton') }}</UButton>
        <div v-else class="cloud-setup-actions">
          <UButton :href="login" target="_blank" rel="noopener noreferrer" icon="i-lucide-external-link">{{ t('cloud.openNextcloud') }}</UButton>
          <UButton variant="soft" :loading="loading" @click="finish">{{ t('cloud.checkConnection') }}</UButton>
        </div>
      </section>
    </template>
  </UModal>
</template>

<style scoped>
.spotlight-footer {
  display: grid;
  gap: 4px;
  padding: 10px 20px 12px;
  border-top: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  background: color-mix(in srgb, var(--ui-text) 4%, transparent);
}
:deep(.spotlight-input input) { font-size: clamp(17px, 3vw, 24px); padding-block: 15px; }
.spotlight-filtered :deep(.spotlight-input input) { padding-inline-end: 56px; }
:deep(.spotlight-input input:focus-visible) {
  outline: none;
}
@media (forced-colors: active), (prefers-contrast: more) {
  :deep(.spotlight-input input:focus-visible) {
    outline: 2px solid currentColor;
    outline-offset: -2px;
  }
}
:deep(.spotlight-results) { max-height: min(46dvh, 350px); }
.spotlight-file-icon { display: grid; flex: 0 0 28px; place-items: center; }
.spotlight-provider {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: color-mix(in srgb, currentColor 10%, transparent);
  cursor: pointer;
}
.spotlight-provider .iconify { grid-area: 1 / 1; width: 17px; height: 17px; }
.provider-remove, .spotlight-provider:is(:hover, :focus-visible) .provider-icon { visibility: hidden; }
.spotlight-provider:is(:hover, :focus-visible) .provider-remove { visibility: visible; }
:deep(.spotlight-status) { padding: 0; }
.cloud-hint, .cloud-setup p { color: var(--ui-text-muted); font-size: 13px; }
.cloud-setup { display: grid; justify-items: center; gap: 14px; text-align: center; padding: 26px 20px; }
.cloud-setup h2 { font-size: 16px; font-weight: 650; }
.cloud-setup p { margin: 5px auto 0; max-width: 33ch; }
.cloud-setup-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
</style>
