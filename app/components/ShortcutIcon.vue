<script setup lang="ts">
import { selfhstUrl } from '~~/shared/selfhst'

const props = defineProps<{ icon: string, color?: string }>()
const url = computed(() => selfhstUrl(props.icon))
const failedUrls = shallowRef(new Set<string>())
const logo = computed(() => {
  if (!url.value || !failedUrls.value.has(url.value)) return url.value
  const fallback = selfhstUrl(props.icon, 'png')
  return fallback && !failedUrls.value.has(fallback) ? fallback : null
})

watch(() => props.icon, () => { failedUrls.value = new Set() })

function imageFailed(event: Event) {
  const src = (event.currentTarget as HTMLImageElement).src
  if (src === logo.value) failedUrls.value = new Set([...failedUrls.value, src])
}
</script>

<template>
  <GlassSurface as="span" class="app-icon" :class="{ 'app-icon-logo': logo }" :data-color="color" aria-hidden="true">
    <img v-if="logo" :key="logo" :src="logo" alt="" draggable="false" referrerpolicy="no-referrer" loading="lazy" decoding="async" @error="imageFailed">
    <UIcon v-else :name="'i-lucide-' + (url ? 'link' : icon)" />
  </GlassSurface>
</template>
