<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <main class="login-screen">
    <GlassSurface strength="strong" class="login-panel">
      <UIcon name="i-lucide-circle-check" class="login-icon" />
      <h1>{{ t('logout.title') }}</h1>
      <p>{{ t('logout.message') }}</p>
      <UButton href="/auth/login" :label="t('logout.action')" icon="i-lucide-arrow-right" trailing />
    </GlassSurface>
  </main>
</template>
