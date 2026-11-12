import { readBody } from 'h3'
import { readCalendarSettings, writeCalendarSettings } from '../calendar-settings'
import { CalendarCache, DiscoveryCache, IdentityRateLimiter } from './calendar-cache'
import type { CalendarHandlerDeps } from './handler'

const DISCOVERY_TTL_MS = 10 * 60_000

const identityLimiter = new IdentityRateLimiter(30, 60_000, Date.now)
const discoveryCache = new DiscoveryCache(DISCOVERY_TTL_MS, () => Date.now())

let cache: CalendarCache | undefined
let cacheTtlMs = -1

function getCache(ttlMs: number): CalendarCache {
  if (!cache || cacheTtlMs !== ttlMs) {
    cache = new CalendarCache({ ttlMs, now: Date.now })
    cacheTtlMs = ttlMs
  }
  return cache
}

export function calendarHandlerDeps(): CalendarHandlerDeps {
  return {
    authenticate: async event => {
      const { user } = await requireUserSession(event)
      return user
    },
    rawConfig: event => {
      const config = useRuntimeConfig(event)
      return {
        haUrl: config.haUrl,
        haToken: config.haToken,
        haCalendarIds: config.haCalendarIds,
        haRequestTimeoutMs: config.haRequestTimeoutMs,
        haCacheTtlSeconds: config.haCacheTtlSeconds,
        haCalendarTimezone: config.haCalendarTimezone
      }
    },
    readSettings: (event, owner) => readCalendarSettings(db(event), owner),
    writeSettings: (event, owner, settings) => writeCalendarSettings(db(event), owner, settings),
    fetchImpl: (input, init) => fetch(input, init),
    now: () => Date.now(),
    log: message => console.error(message),
    getCache: ttlMs => getCache(ttlMs),
    getDiscovery: () => discoveryCache,
    identityLimiter,
    readBody: event => readBody(event),
    checkOrigin: event => requireSameOrigin(event)
  }
}
