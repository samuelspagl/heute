<script setup lang="ts">
import type { PocketIdApp } from '~~/shared/dashboard'

const props = defineProps<{ sectionId: string, sectionTitle: string }>()
const emit = defineEmits<{ imported: [count: number] }>()
const { t } = useI18n()

const open = ref(false)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const reloadSelection = ref(false)
const missingSection = ref(false)
const apps = ref<PocketIdApp[]>([])
const selected = ref(new Set<string>())
const descriptionPrefix = useId()
let request: AbortController | undefined

const statusLabels = computed<Record<string, string>>(() => ({
  existing: t('pocketId.existing'),
  'invalid-url': t('pocketId.invalidUrl'),
  'invalid-name': t('pocketId.invalidName')
}))

function statusCode(cause: unknown) {
  return cause && typeof cause === 'object' && 'statusCode' in cause ? cause.statusCode : undefined
}

function loadError(cause: unknown) {
  const status = statusCode(cause)
  if (status === 401 || status === 403) return t('pocketId.loginRequired')
  if (status === 503) return t('pocketId.notConfigured')
  return t('pocketId.loadFailed')
}

async function loadApps() {
  request?.abort()
  request = new AbortController()
  const { signal } = request
  loading.value = true
  error.value = ''
  reloadSelection.value = false
  missingSection.value = false
  apps.value = []
  selected.value.clear()
  try {
    const result = await $fetch('/api/pocket-id/apps', { signal, retry: 0 })
    if (!signal.aborted) apps.value = result
  } catch (cause) {
    if (!signal.aborted) {
      error.value = loadError(cause)
      reloadSelection.value = true
    }
  } finally {
    if (!signal.aborted) loading.value = false
  }
}

watch(open, value => {
  if (value) void loadApps()
  else request?.abort()
})
onBeforeUnmount(() => request?.abort())

async function importApps() {
  if (loading.value || saving.value || reloadSelection.value || missingSection.value || !selected.value.size) return
  saving.value = true
  error.value = ''
  try {
    const selection = apps.value.flatMap(({ id, url }) => selected.value.has(id) && url ? [{ id, url }] : [])
    const result = await $fetch('/api/pocket-id/import', {
      method: 'POST', body: { sectionId: props.sectionId, apps: selection }
    })
    open.value = false
    emit('imported', result.imported)
  } catch (cause) {
    switch (statusCode(cause)) {
      case 409:
        reloadSelection.value = true
        error.value = t('pocketId.changed')
        break
      case 404:
        missingSection.value = true
        error.value = t('pocketId.sectionMissing')
        break
      case 422:
        error.value = t('pocketId.noSpace')
        break
      default:
        error.value = loadError(cause)
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('pocketId.title')"
    :description="t('pocketId.description', { title: sectionTitle })"
    :dismissible="!saving"
    :ui="{
      content: 'glass-surface editor-glass ring-0 sm:max-w-2xl',
      overlay: 'editor-glass-backdrop',
      body: 'min-h-0',
      footer: 'justify-end'
    }">
    <UButton color="neutral" variant="soft" size="sm" icon="i-lucide-import">{{ t('pocketId.title') }}</UButton>

    <template #close="{ ui }">
      <UButton icon="i-lucide-x" color="neutral" variant="ghost" :aria-label="t('pocketId.close')" :disabled="saving" :class="ui.close()" />
    </template>

    <template #body>
      <p v-if="loading" role="status">{{ t('pocketId.loading') }}</p>
      <div v-if="error" class="space-y-2">
        <p role="alert">{{ error }}</p>
        <UButton v-if="reloadSelection" color="neutral" variant="outline" @click="loadApps">{{ t('pocketId.reload') }}</UButton>
      </div>
      <p v-if="!loading && !error && !apps.length">{{ t('pocketId.none') }}</p>
      <ul v-if="apps.length" class="import-grid mt-3" role="list" :aria-label="t('pocketId.listLabel')">
        <li v-for="(app, index) in apps" :key="app.id" class="min-w-0">
          <label class="import-tile">
            <input v-model="selected" type="checkbox" :value="app.id"
              :disabled="app.status !== 'available' || saving || reloadSelection || missingSection"
              :aria-labelledby="`${descriptionPrefix}-name-${index}`"
              :aria-describedby="`${descriptionPrefix}-details-${index}`"
              class="absolute end-3 top-3 size-4 accent-(--ui-primary)">
            <ShortcutIcon :icon="app.icon" />
            <span :id="`${descriptionPrefix}-name-${index}`" class="text-sm font-semibold">{{ app.name || t('pocketId.unnamed') }}</span>
            <span :id="`${descriptionPrefix}-details-${index}`" class="space-y-1 text-xs text-muted">
              <span v-if="app.url" class="block">{{ app.url }}</span>
              <span v-if="app.status !== 'available'" class="block font-medium">{{ statusLabels[app.status] }}</span>
            </span>
          </label>
        </li>
      </ul>
    </template>

    <template #footer="{ close }">
      <UButton color="neutral" variant="outline" :disabled="saving" @click="close">{{ t('action.cancel') }}</UButton>
      <UButton :disabled="loading || reloadSelection || missingSection || !selected.size" :loading="saving" @click="importApps">
        {{ selected.size ? t('pocketId.importCount', { count: selected.size }) : t('pocketId.import') }}
      </UButton>
    </template>
  </UModal>
</template>

<style scoped>
.import-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 9.5rem), 1fr));
  gap: .75rem;
}

.import-tile {
  --shortcut-size: 44px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: .375rem;
  height: 100%;
  padding: .875rem .625rem;
  border: 1px solid var(--ui-border);
  border-radius: .75rem;
  background: var(--ui-bg-elevated);
  cursor: pointer;
  text-align: center;
  overflow-wrap: anywhere;
}

.import-tile:has(:checked) {
  border-color: var(--ui-primary);
  background: color-mix(in srgb, var(--ui-primary) 10%, var(--ui-bg-elevated));
}

.import-tile:has(:focus-visible) {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.import-tile:has(:disabled) {
  cursor: default;
}

.import-tile:has(:disabled) :deep(.app-icon) {
  opacity: .55;
}
</style>
