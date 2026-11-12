// Target destination: app/middleware/auth.ts
// UX-only guard. ALWAYS check session and permissions in server API routes.
export default defineNuxtRouteMiddleware(async (to) => {
  const { ready, loggedIn, fetch } = useUserSession()
  if (!ready.value) await fetch()
  if (!loggedIn.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
// After login, validate any redirect path before using it (same-origin only).
