import * as oidc from 'openid-client'
import type { H3Event } from 'h3'

export const callbackPath = '/auth/callback'

let discovery: Promise<oidc.Configuration> | undefined

export function oidcConfig(event: H3Event) {
  const { oidcIssuer, oidcClientId, oidcClientSecret } = useRuntimeConfig(event)
  if (!oidcIssuer || !oidcClientId || !oidcClientSecret) {
    throw createError({ statusCode: 503, statusMessage: 'Pocket ID configuration required' })
  }
  discovery ??= oidc.discovery(new URL(oidcIssuer), oidcClientId, oidcClientSecret, undefined, {
    execute: [oidc.enableNonRepudiationChecks]
  })
    .catch((error: unknown) => {
      discovery = undefined
      throw error
    })
  return discovery
}

export function oidcFlow(event: H3Event, state: string) {
  return useSession<{ state: string, nonce: string, verifier: string }>(event, privateCookie(event, 'heute-oidc-' + state, 600))
}
