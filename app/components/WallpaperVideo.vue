<script setup lang="ts">
import { useDocumentVisibility, usePreferredReducedMotion } from '@vueuse/core'

defineProps<{ src: string, poster?: string }>()
const emit = defineEmits<{ error: [] }>()
const media = useTemplateRef<HTMLVideoElement>('media')
const reducedMotion = usePreferredReducedMotion()
const visibility = useDocumentVisibility()
const ready = ref(false)

function syncPlayback() {
  const video = media.value
  if (!video) return
  if (visibility.value === 'visible' && reducedMotion.value !== 'reduce') {
    void video.play().catch(() => {})
  } else {
    video.pause()
  }
}

onMounted(() => {
  if (media.value) media.value.muted = true
})

watch([media, visibility, reducedMotion], syncPlayback, { flush: 'post' })
</script>

<template>
  <div class="wallpaper-video" :style="poster ? {
    backgroundImage: `url('${poster}')`,
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center'
  } : undefined">
    <video ref="media" :src="src" :poster="poster" autoplay muted loop playsinline preload="auto"
      :class="{ 'is-playing': ready }" @loadeddata="ready = true" @canplay="syncPlayback" @error="emit('error')" />
  </div>
</template>
