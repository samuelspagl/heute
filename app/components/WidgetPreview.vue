<script setup lang="ts">
import type { WidgetDefinition } from '~/utils/widget-registry'

defineProps<{ widget: WidgetDefinition }>()
</script>

<template>
  <div class="widget-preview" aria-hidden="true">
    <div class="widget-preview__stage">
      <component :is="widget.component" v-bind="widget.previewProps" />
    </div>
  </div>
</template>
