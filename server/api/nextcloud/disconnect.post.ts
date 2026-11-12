export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const base = cloudBase(event)
  const key = cloudEncryptionKey(event)
  await (await cloudFlow(event)).clear()
  clearLegacyCloudCookie(event)
  const { removed, credentials } = removeCloudConnection(db(event), user.id, base.href, key)
  if (!credentials) return { revoked: !removed }

  try {
    const response = await $fetch.raw<{ ocs?: { meta?: { statuscode?: number | string } } }>(
      new URL('ocs/v2.php/core/apppassword?format=json', base).href, {
        ...cloudFetch, method: 'DELETE', headers: cloudHeaders(credentials)
      }
    )
    const status = Number(response._data?.ocs?.meta?.statuscode)
    return { revoked: response.ok && (status === 100 || status === 200) }
  } catch {
    return { revoked: false }
  }
})
