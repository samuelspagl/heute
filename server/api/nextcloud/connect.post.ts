export default defineEventHandler(async (event) => {
  requireSameOrigin(event)
  const user = await requireMember(event)
  const base = cloudBase(event)
  cloudEncryptionKey(event)
  const result = await $fetch<{ login: string, poll: { endpoint: string, token: string } }>(
    new URL('index.php/login/v2', base).href, { ...cloudFetch, method: 'POST', headers: { 'User-Agent': 'Heute Dashboard' } }
  ).catch(() => { throw createError({ statusCode: 502, statusMessage: 'Nextcloud connection failed' }) })
  if (typeof result?.login !== 'string' || typeof result.poll?.endpoint !== 'string' ||
      typeof result.poll?.token !== 'string' || result.poll.token.length > 512) {
    throw createError({ statusCode: 502, statusMessage: 'Invalid Nextcloud response' })
  }
  const login = cloudUrl(result.login, base).href
  const flow = await cloudFlow(event)
  await flow.update({ owner: user.id, baseUrl: base.href, endpoint: cloudUrl(result.poll.endpoint, base).href, token: result.poll.token })
  return { login }
})
