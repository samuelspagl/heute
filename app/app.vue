<template>
  <UApp>
    <GlassOptics />
    <NuxtPage />
  </UApp>
</template>

<script setup lang="ts">
const { app: { baseURL } } = useRuntimeConfig()
const { t } = useI18n()
const localeHead = useLocaleHead()

useHead(() => ({
  htmlAttrs: { lang: localeHead.value.htmlAttrs?.lang },
  title: t('app.title'),
  link: [
    { rel: 'apple-touch-icon', sizes: '180x180', href: baseURL + 'apple-touch-icon.png' },
    ...(localeHead.value.link ?? [])
  ]
}))
</script>
