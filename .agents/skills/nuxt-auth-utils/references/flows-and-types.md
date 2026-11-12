# Auth flows, sessions, and typing

## OAuth login (GitHub example)

1. Add `nuxt-auth-utils` to `modules` and set `NUXT_APP_SECRET` in production.
2. Register a GitHub OAuth application with callback `https://<your-host>/auth/github`.
3. Set `NUXT_OAUTH_GITHUB_CLIENT_ID` and `NUXT_OAUTH_GITHUB_CLIENT_SECRET` securely.
4. Create `server/routes/auth/github.get.ts` using `defineOAuthGitHubEventHandler({ async onSuccess(event, { user }) { ... } })`.
5. In `onSuccess`, verify provider identity (handled by provider handler), lookup/link the provider identity to an internal database user, then call `setUserSession(event, { user: { id: appUser.id } })`.
6. Redirect using `sendRedirect` from `nuxt/server` to a safe application path. Never follow arbitrary callback `redirect` query strings without same-origin validation.

`assets/github.get.ts` illustrates the shape but has an intentionally unimplemented database function. Treat as a **template**, not production runnable code.

## Type-safe session

Create `shared/types/auth.d.ts`, as in `assets/auth.d.ts`, with `declare module '#auth-utils'` and an `interface User`. Pick only small public session fields. `secure` session fields are server-only in the module API, but the underlying data is still sealed into a cookie; don't put credentials or high-value tokens there without a documented threat model.

## Access a session on server

```ts
import { defineEventHandler } from 'nuxt/server'
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event) // 401 if missing
  const record = await getProjectOnlyIfUserCanRead(user.id, event)
  return record
})
```

`getProjectOnlyIfUserCanRead` stands for an app-specific DB permission check; don't return raw project rows without it.

## Client route protection

```ts
// app/middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const { ready, loggedIn, fetch } = useUserSession()
  if (!ready.value) await fetch()
  if (!loggedIn.value) return navigateTo('/login')
})
```

Use this for navigation only. Never rely on it for authorization. Avoid calling server-side user-session `fetch` in request loops caused by custom auth interceptors. Keep `/api/_auth/session` public to the module's session logic.

## Password login

For password auth, validate the form server-side and use the module's `hashPassword` / `verifyPassword` utilities. Add account enumeration protections, request throttling, password recovery, verification of signup identity, and audit logs. Don't store plaintext passwords, and never return password hashes from API endpoints. Consider an established identity provider if advanced policy is needed.

## Logout

`useUserSession().clear()` logs out the current browser session; `clearUserSession(event)` can clear it on the server. Separately revoke refresh tokens or app-level credentials when applicable. If immediate revocation of sealed-cookie sessions is needed, maintain a DB-backed session/version allowlist or equivalent revocation mechanism.
