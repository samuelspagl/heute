import * as oidc from 'openid-client'

export default defineEventHandler(async (event) => {
  try {
    const callbackState = getQuery(event).state
    if (typeof callbackState !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(callbackState)) {
      return sendRedirect(event, '/anmeldung')
    }
    const flow = await oidcFlow(event, callbackState)
    const { state, nonce, verifier } = flow.data
    await flow.clear()
    if (!state || !nonce || !verifier) return sendRedirect(event, '/anmeldung')

    const config = await oidcConfig(event)
    const callback = new URL(callbackPath, appOrigin(event))
    callback.search = getRequestURL(event).search
    const tokens = await oidc.authorizationCodeGrant(config, callback, {
      pkceCodeVerifier: verifier, expectedState: state, expectedNonce: nonce, idTokenExpected: true
    })
    const claims = tokens.claims()
    if (!claims?.sub) return sendRedirect(event, '/anmeldung')

    const profile = await oidc.fetchUserInfo(config, tokens.access_token, claims.sub)
    const groupClaim = claims.groups ?? profile.groups
    const groups = Array.isArray(groupClaim) ? groupClaim : []
    const { familyGroup, adminGroup } = useRuntimeConfig(event)
    if (!familyGroup || !groups.includes(familyGroup)) return sendRedirect(event, '/anmeldung')

    const displayName = profile.given_name || profile.name || profile.preferred_username || 'Familie'
    await replaceUserSession(event, {
      user: { id: JSON.stringify([claims.iss, claims.sub]), name: String(displayName).slice(0, 120), admin: Boolean(adminGroup && groups.includes(adminGroup)) }
    })
    return sendRedirect(event, '/')
  } catch {
    return sendRedirect(event, '/anmeldung')
  }
})
