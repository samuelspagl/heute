<script setup lang="ts">
import type { Page } from '~~/shared/dashboard'

const { t } = useI18n()

defineProps<{
  pages: Page[]
  activeIndex: number
  editMode: boolean
}>()

const emit = defineEmits<{
  select: [index: number]
  create: []
  edit: []
  moveLeft: []
  moveRight: []
  remove: []
}>()
</script>

<template>
  <div class="page-indicator" role="tablist" :aria-label="t('pages.label')">
    <div class="glass-surface page-indicator__bar">
      <button v-for="(page, index) in pages" :key="page.id" type="button" role="tab"
        class="page-dot" :class="{ 'page-dot--active': index === activeIndex }"
        :aria-selected="index === activeIndex" :aria-label="page.title" :title="page.title"
        @click="emit('select', index)" />
      <button v-if="editMode" type="button" class="page-dot page-dot--add" :aria-label="t('pages.new')" :title="t('pages.new')"
        @click="emit('create')">
        <UIcon name="i-lucide-plus" aria-hidden="true" />
      </button>

      <template v-if="editMode">
        <span class="page-indicator__divider" aria-hidden="true" />
        <button type="button" class="page-action" :aria-label="t('pages.moveLeftLabel')" :title="t('pages.moveLeft')"
          @click="emit('moveLeft')">
          <UIcon name="i-lucide-chevron-left" aria-hidden="true" />
        </button>
        <button type="button" class="page-action" :aria-label="t('pages.edit')" :title="t('pages.edit')"
          @click="emit('edit')">
          <UIcon name="i-lucide-pencil" aria-hidden="true" />
        </button>
        <button type="button" class="page-action" :aria-label="t('pages.moveRightLabel')" :title="t('pages.moveRight')"
          @click="emit('moveRight')">
          <UIcon name="i-lucide-chevron-right" aria-hidden="true" />
        </button>
        <button type="button" class="page-action page-action--danger" :aria-label="t('pages.delete')" :title="t('pages.delete')"
          @click="emit('remove')">
          <UIcon name="i-lucide-trash-2" aria-hidden="true" />
        </button>
      </template>
    </div>
  </div>
</template>
