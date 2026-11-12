<script setup lang="ts">
const { t } = useI18n()

const connected = ref<boolean>()
const busy = ref(true)
const message = ref('')

onMounted(async () => {
  try {
    connected.value = (await $fetch('/api/nextcloud/search')).connected
  } catch {
    message.value = t('nextcloud.statusFailed')
  } finally {
    busy.value = false
  }
})

async function disconnect() {
  if (busy.value || !connected.value) return
  busy.value = true
  message.value = ''
  try {
    const { revoked } = await $fetch('/api/nextcloud/disconnect', { method: 'POST' })
    connected.value = false
    if (!revoked) message.value = t('nextcloud.disconnectNote')
  } catch {
    message.value = t('nextcloud.disconnectFailed')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="grid gap-2">
    <h2>{{ t('nextcloud.title') }}</h2>
    <p v-if="connected === undefined && busy" role="status">{{ t('nextcloud.checking') }}</p>
    <template v-else-if="connected">
      <p class="text-sm text-muted">{{ t('nextcloud.connected') }}</p>
      <UButton class="justify-self-start" color="neutral" variant="soft" size="sm" icon="i-lucide-unplug"
        :loading="busy" @click="disconnect">{{ t('nextcloud.disconnect') }}</UButton>
    </template>
    <p v-else-if="connected === false" class="text-sm text-muted">{{ t('nextcloud.notConnected') }}</p>
    <p v-if="message" class="text-sm" role="alert">{{ message }}</p>
  </section>
</template>
