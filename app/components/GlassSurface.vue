<script setup lang="ts">
/** CSS-first fallback; intentionally does not simulate WebGL refraction. */
withDefaults(defineProps<{
  as?: 'div' | 'button' | 'span'
  strength?: 'soft' | 'medium' | 'strong'
}>(), {
  as: 'div',
  strength: 'medium'
})
</script>

<template>
  <component :is="as" class="glass-surface" :data-strength="strength" :type="as === 'button' ? 'button' : undefined">
    <component :is="as === 'div' ? 'div' : 'span'" class="glass-surface__content"><slot /></component>
  </component>
</template>

<style scoped>
.glass-surface { position: relative; overflow: hidden; }
.glass-surface__content { position: relative; display: block; }
</style>
