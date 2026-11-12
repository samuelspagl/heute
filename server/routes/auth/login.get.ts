import * as oidc from 'openid-client'

export default defineEventHandler(async (event) => {
  try {
    const config = await oidcConfig(event)
    const state = oidc.randomState()
    const flow = await oidcFlow(event, state)
    const nonce = oidc.randomNonce()
    const verifier = oidc.randomPKCECodeVerifier()
    await flow.update({ state, nonce, verifier })
    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: appOrigin(event) + callbackPath,
      scope: 'openid profile groups',
      code_challenge: await oidc.calculatePKCECodeChallenge(verifier),
      code_challenge_method: 'S256',
      state,
      nonce
    })
    return sendRedirect(event, url.href)
  } catch {
    return sendRedirect(event, '/anmeldung')
  }
})
