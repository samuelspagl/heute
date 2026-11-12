export default defineNuxtConfig({
  modules: ['@nuxt/ui', 'nuxt-auth-utils', '@nuxtjs/i18n'],
  i18n: {
    locales: [
      { code: 'de', language: 'de-DE', file: 'de.ts' },
      { code: 'en', language: 'en-US', file: 'en.ts' }
    ],
    defaultLocale: 'de',
    strategy: 'prefix_except_default',
    langDir: 'locales',
    detectBrowserLanguage: { useCookie: true, cookieKey: 'heute_locale', redirectOn: 'root' }
  },
  ui: { fonts: false },
  nitro: { preset: 'bun', rollupConfig: { external: ['bun:sqlite'] } },
  css: ['~/assets/main.css'],
  runtimeConfig: {
    appUrl: 'http://localhost:3000',
    session: { maxAge: 8 * 60 * 60, cookie: { sameSite: 'lax', httpOnly: true, secure: true } },
    oidcIssuer: '',
    oidcClientId: '',
    oidcClientSecret: '',
    pocketIdApiKey: '',
    familyGroup: 'family',
    adminGroup: 'heute-admin',
    databasePath: './data/heute.sqlite',
    weatherPlace: '',
    weatherLatitude: '',
    weatherLongitude: '',
    weatherTimezone: 'Europe/Berlin',
    nextcloudUrl: '',
    nextcloudEncryptionKey: '',
    rssFeeds: '[]',
    haUrl: '',
    haToken: '',
    haCalendarIds: '',
    haRequestTimeoutMs: 10000,
    haCacheTtlSeconds: 90,
    haCalendarTimezone: 'Europe/Berlin',
    public: { demo: false }
  },
  routeRules: {
    '/': { headers: { 'cache-control': 'private, no-store' } },
    '/en': { headers: { 'cache-control': 'private, no-store' } },
    '/api/**': { headers: { 'cache-control': 'private, no-store' } },
    '/auth/**': { headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } }
  },
  typescript: { tsConfig: { compilerOptions: { types: ['bun'] } } }
})
