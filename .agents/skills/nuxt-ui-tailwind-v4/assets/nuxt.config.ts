// Merge into existing Nuxt 4 config; do not blindly overwrite other modules.
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css']
})
