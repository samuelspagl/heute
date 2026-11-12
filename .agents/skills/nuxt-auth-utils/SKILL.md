---
name: nuxt-auth-utils
description: Implement and review secure Nuxt Auth Utils authentication in Nuxt 4.6+, including sealed-cookie sessions, OAuth providers, password hashing, passkeys, route middleware, authorization, and server API protection. Use when building login/logout, auth guards, session types, GitHub/Google OAuth, or migrating nuxt-auth-utils v0.5 to v0.6.
compatibility: nuxt-auth-utils v0.6.x and Nuxt >=4.6 with a running Nuxt server; requires NUXT_APP_SECRET in production.
metadata:
  version: "1.0.0"
  updated: "2026-11-10"
---

# Nuxt Auth Utils — secured sessions and authorization

Target **Nuxt Auth Utils v0.6.x**, which uses Nuxt's `appSecret` and `nuxt/server` APIs. Do **not** apply older tutorials that set `NUXT_SESSION_PASSWORD` for v0.6. Different auth libraries (`nuxt-better-auth`, `sidebase/nuxt-auth`) are not API-compatible.

## Trigger

Use for session cookies, Nuxt Auth Utils, OAuth providers, login/logout, password reset, passkey authentication, route protection, protected Nitro APIs, user identity mapping, and session migration work.

## Implementation workflow

1. **Detect versions and deployment:** Check `package.json`, `nuxt.config.ts`, runtime preset and build mode. `nuxt-auth-utils` v0.6 requires Nuxt **4.6+** and a real server (`nuxt build`); it does not work as a fully static `nuxt generate` application.
2. **Install module:** `npx nuxi@latest module add auth-utils` or add `nuxt-auth-utils` under `modules`. Keep other auth modules out unless explicitly required.
3. **Provision secrets:** Set **`NUXT_APP_SECRET`** (at least 32 characters) on the deployed runtime. Generate securely (e.g. `openssl rand -base64 32`) and store it outside git. Use the same secret on every replica; plan rotation, invalidation and rollback. Do not put it in `runtimeConfig.public`.
4. **Define identity model:** Prefer database-backed internal user IDs with OAuth provider identities in separate linked records. Only set authenticated session **after** validating credentials/provider identity and mapping to an app user. Do not trust a client-supplied `userId`/role.
5. **Define typed session:** Add `shared/types/auth.d.ts` with augmentation for `User` and `UserSession`. Keep sealed cookies small (under ~4096 bytes) and store minimally necessary data.
6. **Create login path:** Use `defineOAuth<Provider>EventHandler` with server-side `onSuccess` to upsert/look up user and set session; or validated password/passkey flow. Never embed provider client secret or raw access token into client-visible `user` data.
7. **Protect server APIs:** Call `requireUserSession(event)` for authentication in each sensitive endpoint; perform **resource-level authorization** against database ownership and roles. Client route middleware is UX only, not security.
8. **Protect pages:** Use named middleware for navigation/redirects and `useUserSession()` for display state. Avoid making redirects that interfere with `/api/_auth/session`, OAuth callbacks, or public content.
9. **Handle logout/session lifecycle:** Use `useUserSession().clear()` on client or `clearUserSession(event)` on server; revoke server-side tokens/credentials as appropriate. Revalidate identity/permissions when they can change during a session.
10. **Verify security:** Test cookie flags, unauthorized API access, open redirects, CSRF defenses, OAuth state/callbacks, account linking and role changes, secret handling, multi-instance deployment, and logout.

## Core APIs (v0.6)

```ts
// server/api/me.get.ts
import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return { user }
})
```

```vue
<script setup lang="ts">
const { user, loggedIn, ready, clear, fetch } = useUserSession()
</script>
<template>
  <div v-if="ready">
    <p v-if="loggedIn">Hello {{ user?.name }}</p>
    <a v-else href="/auth/github">Sign in</a>
    <button v-if="loggedIn" @click="clear()">Sign out</button>
  </div>
</template>
```

Server helpers: `setUserSession` (merges), `replaceUserSession` (replaces), `getUserSession`, `requireUserSession`, `clearUserSession`. For route handlers prefer `defineEventHandler` / `sendRedirect` from `nuxt/server`. Client composable includes `ready`, `loggedIn`, `user`, `session`, `fetch`, `clear`, `openInPopup`.

Read [login and session patterns](references/flows-and-types.md) for OAuth/middleware templates, [security review](references/security-checklist.md) for production requirements, and [migration and deployment](references/migration-deployment.md) for v0.5 changes and reverse-proxy issues.

## Starter files

Assets under `assets/` are independent **examples** to adapt, not a complete auth app:

- `nuxt.config.snippet.ts` — module and session max-age
- `auth.d.ts` — TypeScript augmentation
- `github.get.ts` — minimal GitHub OAuth callback (replace TODO with DB mapping in production)
- `auth-middleware.ts` — named client-side page guard
- `me.get.ts` — protected server endpoint

Do not copy OAuth examples without implementing the persistent account lookup and authorization policies relevant to the app.

## Anti-patterns

- No `NUXT_SESSION_PASSWORD` in v0.6; no `runtimeConfig.session.password`.
- Never enforce authorization solely through page middleware or `loggedIn` checks.
- Do not store entire OAuth profiles, tokens, passwords, or sensitive personal data in session cookies.
- Do not accept resource owner IDs or roles from request bodies without DB authorization.
- Do not disable secure cookie flags because a reverse proxy terminates TLS; browser-facing HTTPS still needs `Secure`.
- Do not break `/api/_auth/session` with blanket server middleware.
- Do not use `nuxt generate` for an Auth Utils-only backend.

## Done criteria

- [ ] Installed version and Nuxt minimum version confirmed
- [ ] Deployed `NUXT_APP_SECRET` is present, secret, and stable across replicas
- [ ] Authenticated session comes from a trusted verified credential/OAuth callback
- [ ] Client-visible session does not include sensitive tokens; cookie under size limit
- [ ] Sensitive endpoints use both `requireUserSession` and resource authorization
- [ ] CSRF/Origin, rate limiting, account linking and redirects considered
- [ ] Login/logout, 401/403, SSR refresh, callback error and role-change tests pass
- [ ] Production build and application's lint/typecheck/tests pass

## Sources

See [source notes](references/sources.md). Re-verify security-relevant APIs against the deployed module version.
