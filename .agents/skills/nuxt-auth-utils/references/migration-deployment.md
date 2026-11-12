# v0.6 migration and deployment

As of 2026-11-10, Nuxt Auth Utils module docs show v0.6.2 and require Nuxt 4.6+. Re-check release notes before future upgrades.

## Migrating from v0.5

- Upgrade Nuxt to >= 4.6 first.
- Generate/set `NUXT_APP_SECRET`; remove `NUXT_SESSION_PASSWORD`.
- Expect existing users to be logged out on migration: cookie changed from `nuxt-session` to `nuxt-auth-session` and format changed.
- Old `sessionHeader`, `seal`, `crypto`, `generateId` and `password` config options are removed.
- For `createError`, prefer `status` in new Nuxt server APIs rather than `statusCode`.
- On OAuth callbacks, import `sendRedirect` (and other response helpers) from `nuxt/server`.
- `requireUserSession` supports `{ status: 403 }`; older `{ statusCode: 403 }` is deprecated.
- `nuxt generate` is unsupported for this module: deploy with a running Nitro/Nuxt server.

## Docker and Compose

- Inject `NUXT_APP_SECRET` securely from container orchestration secrets or a protected env file. Never build it into an image or commit it.
- Ensure `NUXT_OAUTH_<PROVIDER>_*` variables are available in the server process.
- Use TLS at the ingress/reverse proxy and retain Secure cookies. Terminating TLS at a proxy is **not** a reason to set `cookie.secure=false`.
- Use a consistent secret across scale-out containers. Consider session invalidation if keys are rotated.
- For plain HTTP automated integration tests only, the module documents a `NUXT_SESSION_COOKIE_SECURE=false` runtime override, **provided** `runtimeConfig.session.cookie.secure` is declared in the config. Never use on public production traffic.

## Common failures

- **500 at startup/login:** missing app secret in built deployment; set `NUXT_APP_SECRET`.
- **OAuth state mismatch:** host/proxy mismatch, redirect URL mismatch, or cookies suppressed under non-HTTPS test setup.
- **Unexpected 401 on session fetch:** middleware intercepted `/api/_auth/session`.
- **Session cookie too large:** reduce data, store durable profile/roles in your database.
- **Hydration flashes logged-out UI:** respect the composable's `ready` state; avoid reading browser storage in SSR.
