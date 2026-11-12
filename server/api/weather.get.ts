import type { Weather } from '~~/shared/weather'

let cached: { expires: number, data: Weather } | undefined

export default defineEventHandler(async (event): Promise<Weather | null> => {
  if (isDemo(event)) return { place: 'Berlin', temperature: 16, low: 11, high: 18, rain: 10, code: 2, daylight: true }
  await requireMember(event)
  const { weatherPlace, weatherLatitude, weatherLongitude, weatherTimezone } = useRuntimeConfig(event)
  if (!weatherPlace || !String(weatherLatitude).trim() || !String(weatherLongitude).trim()) return null
  const latitude = Number(weatherLatitude)
  const longitude = Number(weatherLongitude)
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null
  if (cached && cached.expires > Date.now()) return cached.data

  const data = await $fetch<{
    current: { temperature_2m: number, weather_code: number, is_day: number }
    daily: { temperature_2m_max: number[], temperature_2m_min: number[], precipitation_probability_max: number[] }
  }>('https://api.open-meteo.com/v1/forecast', {
    timeout: 4500, retry: 0,
    query: {
      latitude, longitude, timezone: weatherTimezone, forecast_days: 1,
      current: 'temperature_2m,weather_code,is_day',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    }
  })
  const { current, daily } = data
  const weather = {
    place: weatherPlace, temperature: current.temperature_2m, code: current.weather_code, daylight: Boolean(current.is_day),
    high: daily.temperature_2m_max[0]!, low: daily.temperature_2m_min[0]!, rain: daily.precipitation_probability_max[0]!
  }
  cached = { data: weather, expires: Date.now() + 10 * 60_000 }
  return weather
})
