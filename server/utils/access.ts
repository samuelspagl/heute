import { createHmac } from 'node:crypto'
import type { H3Event } from 'h3'

export function appOrigin(event: H3Event) {
  const url = new URL(useRuntimeConfig(event).appUrl)
  if (url.protocol !== 'https:' && url.origin !== 'http://localhost:3000') {
    throw createError({ statusCode: 503, statusMessage: 'HTTPS origin required' })
  }
  return url.origin
}

export function requireSameOrigin(event: H3Event) {
  if (getHeader(event, 'origin') !== appOrigin(event)) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid origin' })
  }
}

export async function requireMember(event: H3Event) {
  const { user } = await requireUserSession(event)
  return user
}

export function isDemo(event: H3Event) {
  const config = useRuntimeConfig(event)
  return String(config.public.demo) === 'true' && config.appUrl === 'http://localhost:3000'
}

export function privateCookie(event: H3Event, name: string, maxAge: number) {
  const secret = useRuntimeConfig(event).appSecret
  if (typeof secret !== 'string' || secret.length < 32) {
    throw createError({ statusCode: 503, statusMessage: 'Session secret required' })
  }
  return {
    name, maxAge,
    password: createHmac('sha256', secret).update('heute/cookie/' + name).digest('hex'),
    sessionHeader: false as const,
    cookie: { secure: appOrigin(event).startsWith('https:'), httpOnly: true, sameSite: 'lax' as const, path: '/' }
  }
}
