<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <main class="login-screen">
    <GlassSurface strength="strong" class="login-panel">
      <UIcon name="i-lucide-key-round" class="login-icon" />
      <h1>{{ t('login.title') }}</h1>
      <p>{{ t('login.message') }}</p>
      <UButton href="/auth/login" :label="t('login.action')" icon="i-lucide-arrow-right" trailing />
    </GlassSurface>
  </main>
</template>
