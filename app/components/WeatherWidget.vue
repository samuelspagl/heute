<script setup lang="ts">
import type { Weather } from '~~/shared/weather'

const props = defineProps<{ demo?: boolean }>()
const { t } = useI18n()

const sampleWeather: Weather = {
  place: 'Berlin', temperature: 16, low: 11, high: 18, rain: 10, code: 2, daylight: true
}

const { data, status } = useFetch<Weather>('/api/weather', { server: false, immediate: !props.demo })
const weather = computed(() => props.demo ? sampleWeather : data.value)

const condition = computed(() => {
  const code = weather.value?.code ?? 0
  if (code === 0) return [t('weather.clear'), weather.value?.daylight ? 'sun' : 'moon']
  if (code < 3) return [t('weather.partlyCloudy'), weather.value?.daylight ? 'cloud-sun' : 'cloud-moon']
  if (code === 3) return [t('weather.cloudy'), 'cloud']
  if (code < 50) return [t('weather.fog'), 'cloud-fog']
  if ((code >= 70 && code <= 77) || code === 85 || code === 86) return [t('weather.snow'), 'snowflake']
  if (code >= 95) return [t('weather.thunderstorm'), 'cloud-lightning']
  return [t('weather.rain'), 'cloud-rain']
})
</script>

<template>
  <section class="weather widget" :class="{ 'weather-night': weather && !weather.daylight }" :aria-label="t('weather.label')">
    <p class="widget-kicker"><UIcon name="i-lucide-map-pin" /> {{ weather?.place || t('weather.label') }}</p>
    <template v-if="weather">
      <div class="weather-main">
        <div class="weather-temp">
          <strong>{{ Math.round(weather.temperature) }}°</strong>
          <span class="weather-condition">{{ condition[0] }}</span>
        </div>
        <UIcon :name="'i-lucide-' + condition[1]" />
      </div>
      <div class="weather-range">
        <span>H {{ Math.round(weather.high) }}°</span>
        <span>T {{ Math.round(weather.low) }}°</span>
        <span class="weather-rain"><UIcon name="i-lucide-droplet" /> {{ weather.rain }} %</span>
      </div>
      <small v-if="!demo" class="weather-credit" :title="t('weather.creditTitle')">
        {{ t('weather.source') }}: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>
        · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a><span class="sr-only"> · {{ t('weather.rounded') }}</span>
      </small>
    </template>
    <p v-else class="weather-empty">{{ status === 'pending' || status === 'idle' ? t('weather.loading') : status === 'error' ? t('weather.unavailable') : t('weather.notConfigured') }}</p>
  </section>
</template>

<style scoped>
.weather-credit {
  display: block;
  margin-top: .375rem;
  font-size: .6875rem;
  line-height: 1.5;
  font-weight: 400;
}
.weather-credit a:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; border-radius: 2px; }
.weather-credit a { text-decoration: underline; text-underline-offset: 2px; }
</style>
