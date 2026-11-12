// Merge this example into your existing nuxt.config.ts.
export default defineNuxtConfig({
  modules: ['nuxt-auth-utils'],
  runtimeConfig: {
    session: {
      // In seconds; change for your product's session policy.
      maxAge: 60 * 60 * 24 * 7
    }
  }
})
// Deployment requirement for nuxt-auth-utils v0.6.x:
// NUXT_APP_SECRET=<at least 32 cryptographically random characters>
// Generate with: openssl rand -base64 32
// Do not use old NUXT_SESSION_PASSWORD instructions.
