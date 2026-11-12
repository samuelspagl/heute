<script setup lang="ts">
/** CSS-first fallback; intentionally does not simulate WebGL refraction. */
withDefaults(defineProps<{
  strength?: 'soft' | 'medium' | 'strong'
}>(), {
  strength: 'medium'
})
</script>

<template>
  <div class="glass-surface" :data-strength="strength">
    <span class="glass-surface__highlight" aria-hidden="true" />
    <div class="glass-surface__content"><slot /></div>
  </div>
</template>

<style scoped>
.glass-surface {
  --glass-bg: rgb(255 255 255 / 0.28);
  --glass-border: rgb(255 255 255 / 0.52);
  --glass-blur: 15px;
  isolation: isolate;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--ui-radius, 1rem);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(135%);
  backdrop-filter: blur(var(--glass-blur)) saturate(135%);
  box-shadow: 0 12px 34px rgb(0 0 0 / 0.09), inset 0 1px rgb(255 255 255 / 0.32);
}
.glass-surface[data-strength="soft"] { --glass-blur: 8px; --glass-bg: rgb(255 255 255 / 0.20); }
.glass-surface[data-strength="strong"] { --glass-blur: 24px; --glass-bg: rgb(255 255 255 / 0.40); }
.glass-surface__highlight {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(140deg, rgb(255 255 255 / 0.38), transparent 52%);
  z-index: 0;
}
.glass-surface__content { position: relative; z-index: 1; display: block; }
/* The host application's color-mode class takes priority over OS preference. */
:global(.dark) .glass-surface {
  --glass-bg: rgb(24 28 38 / 0.54);
  --glass-border: rgb(255 255 255 / 0.20);
}
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more) {
  .glass-surface { --glass-bg: var(--ui-bg, #fff); --glass-blur: 0px; border-color: currentColor; }
  .glass-surface__highlight { display: none; }
}
@supports not (backdrop-filter: blur(1px)) {
  .glass-surface { background: var(--ui-bg, #f8fafc); }
}
</style>
