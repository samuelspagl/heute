export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const base = cloudBase(event)
  const key = cloudEncryptionKey(event)
  const flow = await cloudFlow(event)
  const { owner, baseUrl, endpoint, token } = flow.data
  if (owner !== user.id || baseUrl !== base.href || !endpoint || !token) {
    throw createError({ statusCode: 410, statusMessage: 'Connection expired' })
  }
  const response = await $fetch.raw<{ loginName: string, appPassword: string }>(
    cloudUrl(endpoint, base).href, {
      ...cloudFetch, method: 'POST', body: new URLSearchParams({ token }),
      ignoreResponseError: true
    }
  ).catch(() => { throw createError({ statusCode: 502, statusMessage: 'Nextcloud connection failed' }) })
  if (response.status === 404) return { connected: false }
  const data = response._data
  if (!response.ok || typeof data?.loginName !== 'string' || typeof data.appPassword !== 'string' ||
      !data.appPassword || data.appPassword.length > 512 || data.loginName.length > 512) {
    throw createError({ statusCode: 502, statusMessage: 'Invalid Nextcloud credentials' })
  }
  saveCloudConnection(db(event), user.id, base.href, key, { loginName: data.loginName, appPassword: data.appPassword })
  await flow.clear()
  clearLegacyCloudCookie(event)
  return { connected: true }
})
