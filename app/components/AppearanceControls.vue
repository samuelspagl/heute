<script setup lang="ts">
import { createReusableTemplate, useMediaQuery } from '@vueuse/core'
import {
  appearanceSizes, hasWallpaperOverlay, isOverlayOpacity, maxWallpaperBytes, maxWallpaperVideoBytes, wallpaperVideoTypes, libraryMediaUrl, libraryPosterUrl, wallpaperPresets,
  wallpaperImageTypes, wallpaperImageUrl, type Appearance, type AppearanceSizeKey, type LibraryWallpaper
} from '~~/shared/appearance'

const props = defineProps<{ demo: boolean, nextcloud: boolean, name: string, initials: string, admin: boolean }>()
const emit = defineEmits<{ logout: [] }>()
const { t } = useI18n()
const [DefineSettings, SettingsContent] = createReusableTemplate()
const narrow = useMediaQuery('(max-width: 760px)', { ssrWidth: 1024 })
const sizeControls: { key: AppearanceSizeKey, labelKey: string }[] = [
  { key: 'iconSize', labelKey: 'appearance.appIcons' },
  { key: 'labelSize', labelKey: 'appearance.appNames' },
  { key: 'widgetWidth', labelKey: 'appearance.widgetColumn' }
]
const appearance = defineModel<Appearance>({ required: true })
const overlayPreview = defineModel<number | null>('overlayPreview', { required: true })
const settingsOpen = ref(false)
const library = ref<LibraryWallpaper[]>([])
const libraryError = ref(false)
async function reloadLibrary() {
  libraryError.value = false
  try { library.value = await $fetch('/api/appearance/library') }
  catch { libraryError.value = true }
}
watch(settingsOpen, async (open) => {
  if (!open || props.demo) return
  await reloadLibrary()
})
const busy = ref(false)
const checkingVideo = ref(false)
const feedback = ref('')
const uploadInput = useTemplateRef<HTMLInputElement>('upload-input')
const libraryInput = useTemplateRef<HTMLInputElement>('library-input')
const libraryBusy = ref(false)
const imageUrl = computed(() => appearance.value.imageVersion ? wallpaperImageUrl(appearance.value.imageVersion) : null)
const overlayValue = computed(() => overlayPreview.value ?? appearance.value.overlayOpacity)

watch([settingsOpen, () => appearance.value.wallpaper], () => { overlayPreview.value = null })

async function update(operation: () => Promise<Appearance>, preview?: Partial<Appearance>,
  errorMessage = t('appearance.changeFailed')) {
  if (busy.value) return
  const previous = appearance.value
  if (preview) appearance.value = { ...previous, ...preview }
  feedback.value = ''
  busy.value = true
  try {
    appearance.value = await operation()
  } catch {
    if (preview) appearance.value = previous
    feedback.value = errorMessage
  } finally {
    busy.value = false
  }
}

function choose(wallpaper: Appearance['wallpaper']) {
  if (props.demo) {
    appearance.value = { ...appearance.value, wallpaper }
    return
  }
  void update(() => $fetch('/api/appearance', { method: 'PUT', body: { wallpaper } }))
}

function adjustOverlay(event: Event, commit: boolean) {
  const control = event.currentTarget as HTMLInputElement
  const value = control.valueAsNumber
  if (busy.value || !isOverlayOpacity(value)) {
    control.value = String(overlayValue.value)
    return
  }
  if (!commit) {
    overlayPreview.value = value
    return
  }

  overlayPreview.value = null
  if (value === appearance.value.overlayOpacity) return
  const patch = { overlayOpacity: value }
  if (props.demo) appearance.value = { ...appearance.value, ...patch }
  else void update(() => $fetch('/api/appearance', { method: 'PUT', body: patch }), patch,
    t('appearance.overlayFailed'))
}

function resize(key: AppearanceSizeKey, event: Event) {
  const control = event.currentTarget as HTMLInputElement
  const value = appearanceSizes[key][control.valueAsNumber]
  if (busy.value || value === undefined) {
    control.value = String(appearanceSizes[key].findIndex(size => size === appearance.value[key]))
    return
  }
  const patch = { [key]: value }
  if (props.demo) appearance.value = { ...appearance.value, ...patch }
  else void update(() => $fetch('/api/appearance', { method: 'PUT', body: patch }), patch, t('appearance.sizeFailed'))
}

async function upload(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || busy.value || checkingVideo.value) return
  const video = wallpaperVideoTypes.some(type => file.type === type)
  if ((!video && !wallpaperImageTypes.some(type => file.type === type)) || file.size > (video ? maxWallpaperVideoBytes : maxWallpaperBytes)) {
    feedback.value = t('appearance.invalidFile')
    return
  }
  let poster: Blob | null = null
  if (video) {
    checkingVideo.value = true
    const probe = await probeVideo(file)
    checkingVideo.value = false
    if (!probe.playable) {
      feedback.value = t('appearance.videoUnsupported')
      return
    }
    poster = probe.poster
  }
  await update(async () => {
    const result = await $fetch('/api/appearance/image', { method: 'POST', body: file, headers: { 'content-type': file.type } })
    if (poster) await $fetch('/api/appearance/poster', { method: 'POST', body: poster, headers: { 'content-type': poster.type } }).catch(() => {})
    return result
  }, undefined, t('appearance.uploadFailed'))
}

async function probeVideo(file: File): Promise<{ playable: boolean, poster: Blob | null }> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { cleanup(); reject(new Error('Video timeout')) }, 10000)
      const cleanup = () => { clearTimeout(timeout); video.onloadeddata = null; video.onerror = null }
      video.onloadeddata = () => { cleanup(); resolve() }
      video.onerror = () => { cleanup(); reject(new Error('Unsupported video')) }
      video.src = url
      video.load()
    })
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { video.onseeked = null; resolve() }, 1500)
      video.onseeked = () => { clearTimeout(timer); video.onseeked = null; resolve() }
      video.currentTime = Math.min(0.1, (video.duration || 1) / 2)
    })
    let poster: Blob | null = null
    if (video.videoWidth && video.videoHeight) {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, 640 / video.videoWidth)
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      poster = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.82))
    }
    return { playable: true, poster }
  } catch {
    return { playable: false, poster: null }
  } finally { URL.revokeObjectURL(url) }
}

function libraryBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').trim()
}

async function uploadLibrary(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || busy.value || libraryBusy.value || checkingVideo.value) return
  const video = wallpaperVideoTypes.some(type => file.type === type)
  if ((!video && !wallpaperImageTypes.some(type => file.type === type)) || file.size > (video ? maxWallpaperVideoBytes : maxWallpaperBytes)) {
    feedback.value = t('appearance.invalidFile')
    return
  }
  let poster: Blob | null = null
  if (video) {
    checkingVideo.value = true
    const probe = await probeVideo(file)
    checkingVideo.value = false
    if (!probe.playable) {
      feedback.value = t('appearance.videoUnsupported')
      return
    }
    poster = probe.poster
  }
  const label = libraryBaseName(file.name)
  if (library.value.some(item => item.label === label) && !window.confirm(t('appearance.libraryReplaceConfirm', { label }))) {
    return
  }
  feedback.value = ''
  libraryBusy.value = true
  try {
    await $fetch('/api/appearance/library?name=' + encodeURIComponent(file.name), { method: 'POST', body: file, headers: { 'content-type': file.type } })
    if (poster) await $fetch('/api/appearance/library-poster?name=' + encodeURIComponent(file.name), { method: 'POST', body: poster, headers: { 'content-type': poster.type } }).catch(() => {})
    await reloadLibrary()
  } catch {
    feedback.value = t('appearance.librarySavedFailed')
  } finally {
    libraryBusy.value = false
  }
}

async function removeLibrary(item: LibraryWallpaper) {
  if (busy.value || libraryBusy.value) return
  if (!window.confirm(t('appearance.libraryRemoveConfirm', { label: item.label }))) return
  libraryBusy.value = true
  try {
    await $fetch('/api/appearance/library?name=' + encodeURIComponent(item.id.slice('library:'.length)), { method: 'DELETE' })
    await reloadLibrary()
  } catch {
    feedback.value = t('appearance.libraryRemovedFailed')
  } finally {
    libraryBusy.value = false
  }
}
</script>

<template>
  <DefineSettings>
    <div class="appearance-options">
      <div class="settings-profile">
        <span class="settings-avatar" aria-hidden="true">{{ initials }}</span>
        <strong>{{ name }}</strong>
        <UButton v-if="!demo" type="button" class="settings-logout" color="neutral" variant="ghost"
          icon="i-lucide-log-out" @click="emit('logout')">{{ t('appearance.logout') }}</UButton>
      </div>
      <section class="settings-section">
        <h2>{{ t('appearance.background') }}</h2>
        <div class="wallpaper-options" :aria-label="t('appearance.backgroundMotives')" role="group">
          <button v-for="preset in wallpaperPresets" :key="preset.id" type="button" :aria-pressed="appearance.wallpaper === preset.id"
            :disabled="busy || checkingVideo" @click="choose(preset.id)">
            <span class="wallpaper-preview" :data-wallpaper="preset.id" aria-hidden="true" />
            <span>{{ t(preset.labelKey) }}</span>
          </button>
          <button v-if="imageUrl" type="button" :aria-pressed="appearance.wallpaper === 'custom'" :disabled="busy || checkingVideo" @click="choose('custom')">
            <video v-if="appearance.mediaType?.startsWith('video/')" class="wallpaper-preview" :src="imageUrl" muted playsinline preload="metadata" aria-hidden="true"></video>
            <img v-else class="wallpaper-preview" :src="imageUrl" alt="">
            <span>{{ appearance.mediaType?.startsWith('video/') ? t('appearance.customVideo') : t('appearance.customImage') }}</span>
          </button>
          <div v-for="item in library" :key="item.id" class="wallpaper-option">
            <button type="button" :aria-pressed="appearance.wallpaper === item.id" :disabled="busy || checkingVideo" @click="choose(item.id)">
              <img v-if="item.type.startsWith('video/') && item.poster" class="wallpaper-preview" :src="libraryPosterUrl(item.id)" alt="" loading="lazy">
              <video v-else-if="item.type.startsWith('video/')" class="wallpaper-preview" :src="libraryMediaUrl(item.id)" muted playsinline preload="metadata" aria-hidden="true"></video>
              <img v-else class="wallpaper-preview" :src="libraryMediaUrl(item.id)" alt="" loading="lazy">
              <span>{{ item.label }}</span>
            </button>
            <button v-if="admin && !demo" type="button" class="wallpaper-delete" :aria-label="t('appearance.removeLabel', { label: item.label })"
              :disabled="busy || libraryBusy" @click.stop="removeLibrary(item)">
              <UIcon name="i-lucide-trash-2" aria-hidden="true" />
            </button>
          </div>
        </div>
        <p v-if="libraryError" role="status">{{ t('appearance.libraryError') }}</p>
        <div v-if="!demo" class="wallpaper-actions">
          <input ref="upload-input" type="file" hidden :accept="[...wallpaperImageTypes, ...wallpaperVideoTypes].join(',')" @change="upload">
          <UButton type="button" size="sm" color="neutral" variant="soft" icon="i-lucide-image-plus" :disabled="busy || checkingVideo" @click="uploadInput?.click()">
            {{ imageUrl ? t('appearance.replace') : t('appearance.add') }}
          </UButton>
          <UButton v-if="imageUrl" type="button" size="sm" color="neutral" variant="ghost" :disabled="busy || checkingVideo"
            @click="update(() => $fetch('/api/appearance/image', { method: 'DELETE' }))">
            {{ t('appearance.removeCustom') }}
          </UButton>
        </div>
        <p v-if="!demo" class="wallpaper-credit">{{ t('appearance.uploadHint') }}</p>
        <div v-if="admin && !demo" class="wallpaper-actions">
          <input ref="library-input" type="file" hidden :accept="[...wallpaperImageTypes, ...wallpaperVideoTypes].join(',')" @change="uploadLibrary">
          <UButton type="button" size="sm" color="neutral" variant="soft" icon="i-lucide-library" :disabled="busy || libraryBusy || checkingVideo" @click="libraryInput?.click()">
            {{ t('appearance.addLibrary') }}
          </UButton>
        </div>
        <p v-if="admin && !demo" class="wallpaper-credit">{{ t('appearance.libraryHint', { code: 'media/library' }) }}</p>
        <label v-if="hasWallpaperOverlay(appearance.wallpaper)" class="settings-slider settings-overlay">
          <span>{{ t('appearance.overlayStrength') }}</span>
          <span class="settings-slider-value" aria-hidden="true">{{ overlayValue }} %</span>
          <input type="range" min="0" max="100" step="1" :value="overlayValue"
            :aria-valuetext="overlayValue + ' %'" :aria-disabled="busy"
            @input="adjustOverlay($event, false)" @change="adjustOverlay($event, true)" @pointercancel="overlayPreview = null">
        </label>
      </section>
      <section class="settings-section">
        <h2>{{ t('appearance.sizes') }}</h2>
        <div class="settings-sizes">
          <label v-for="{ key, labelKey } in sizeControls" :key="key" class="settings-slider">
            <span>{{ t(labelKey) }}</span>
            <span class="settings-slider-value" aria-hidden="true">{{ appearance[key] }} px</span>
            <input type="range" min="0" max="2" step="1" :value="appearanceSizes[key].findIndex(size => size === appearance[key])"
              :aria-valuetext="appearance[key] + ' Pixel'" :aria-disabled="busy" @change="resize(key, $event)">
          </label>
        </div>
      </section>
      <NextcloudSettings v-if="nextcloud && !demo && settingsOpen" class="settings-section" />
      <p v-if="checkingVideo" class="appearance-status" role="status">{{ t('appearance.checkingVideo') }}</p>
      <p v-if="busy" class="appearance-status" role="status">{{ t('appearance.saving') }}</p>
      <p v-if="feedback" class="appearance-status" role="alert">{{ feedback }}</p>
    </div>
  </DefineSettings>

  <UModal v-if="narrow" v-model:open="settingsOpen" :title="t('appearance.settings')" :description="t('appearance.settingsDescription')"
    :ui="{ content: 'glass-surface editor-glass ring-0', overlay: 'editor-glass-backdrop', body: 'p-0 sm:p-0' }">
    <GlassSurface as="button" class="glass-control" :aria-label="t('appearance.settings')" :title="t('appearance.settings')">
      <UIcon name="i-lucide-settings" aria-hidden="true" />
    </GlassSurface>
    <template #body><SettingsContent /></template>
  </UModal>
  <UPopover v-else v-model:open="settingsOpen" :content="{ side: 'bottom', align: 'end', sideOffset: 10 }" :ui="{ content: 'appearance-popover glass-surface menu-glass ring-0' }">
    <GlassSurface as="button" class="glass-control" :aria-label="t('appearance.settings')" :title="t('appearance.settings')">
      <UIcon name="i-lucide-settings" aria-hidden="true" />
    </GlassSurface>
    <template #content><SettingsContent /></template>
  </UPopover>
</template>
