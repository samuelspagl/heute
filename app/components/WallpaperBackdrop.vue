<script setup lang="ts">
import { defaultAppearance, libraryMediaUrl, libraryPosterUrl, wallpaperImageUrl, wallpaperPosterUrl, type Appearance } from '~~/shared/appearance'

const props = defineProps<{ appearance: Appearance, overlayOpacity: number }>()
const media = computed(() => {
  const { wallpaper, imageVersion, mediaType } = props.appearance
  if (wallpaper.startsWith('library:')) {
    const video = /\.(mp4|webm)$/i.test(wallpaper)
    return { url: libraryMediaUrl(wallpaper), video, poster: video ? libraryPosterUrl(wallpaper) : undefined }
  }
  if (wallpaper === 'custom' && imageVersion) {
    const video = mediaType?.startsWith('video/') ?? false
    return { url: wallpaperImageUrl(imageVersion), video, poster: video ? wallpaperPosterUrl(imageVersion) : undefined }
  }
  return null
})
const failed = ref(false)
watch(() => media.value?.url, () => { failed.value = false })
const active = computed(() => failed.value ? null : media.value)
const preset = computed(() => active.value ? 'custom' : props.appearance.wallpaper === 'custom' || props.appearance.wallpaper.startsWith('library:') ? defaultAppearance.wallpaper : props.appearance.wallpaper)
</script>

<template>
  <div class="wallpaper-backdrop" aria-hidden="true" :data-overlay-opacity="overlayOpacity"
    :style="{ '--wallpaper-overlay-strength': overlayOpacity + '%' }">
    <Transition name="wallpaper">
      <div :key="active?.url ?? preset" class="wallpaper-layer" :data-wallpaper="preset"
        :data-video-wallpaper="active?.video ? '' : undefined"
        :style="active && !active.video ? { '--wallpaper-image': `url('${active.url}')` } : undefined">
        <ClientOnly v-if="active?.video">
          <WallpaperVideo :src="active.url" :poster="active.poster" @error="failed = true" />
        </ClientOnly>
        <img v-else-if="active" :src="active.url" class="sr-only" alt="" @error="failed = true">
      </div>
    </Transition>
  </div>
</template>
