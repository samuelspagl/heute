export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname
  if ((pathname !== '/' && pathname !== '/en') || isDemo(event)) return
  const session = await getUserSession(event).catch(() => null)
  if (!session?.user) return sendRedirect(event, '/auth/login')
})
