export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  await clearUserSession(event)
  clearLegacyCloudCookie(event)
  await (await cloudFlow(event)).clear()
  return { ok: true }
})
