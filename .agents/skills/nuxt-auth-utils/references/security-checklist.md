# Production authentication security checklist

## Authentication vs authorization

- `requireUserSession(event)` checks whether there is a valid authenticated session. It **does not** check ownership of a project, tenant isolation, resource access, or administrative rights.
- Map OAuth identities to internal app users; always check authorizations against server-stored roles/ownership. On material role changes, invalidate old sessions or check fresh DB state.
- Avoid trusting roles stored for a long time in stateless cookies without a revocation or refresh policy.

## Session and cookie security

- Set `NUXT_APP_SECRET` as an environment secret, at least 32 characters. Keep stable across running replicas. Rotation invalidates existing sealed sessions unless carefully coordinated.
- Honor default `HttpOnly`, `Secure`, `SameSite=Lax`, and appropriate path/domain settings. Use browser-facing HTTPS.
- Keep cookie under 4096 bytes. The module encrypts/signs sessions, **not** an unlimited server database. Data still leaves the server and should be minimized.
- Avoid cross-subdomain cookie scope unless required and every subdomain is equally trusted.
- Session `maxAge` is re-extended on session writes; document idle/absolute lifetime requirements separately.

## API and transport

- Defend state-changing endpoints against CSRF (validate `Origin` and/or use CSRF tokens as appropriate); `SameSite=Lax` is useful but not a universal policy replacement.
- Validate requests with schema validators on the server and set per-account/IP rate limits for login, password reset, and abuse-sensitive routes.
- Log authentication outcomes without logging secrets, tokens, raw cookie values, password contents or excess personal information.
- Validate allowlisted post-login redirect destinations to prevent open redirects.
- Review third-party OAuth scopes and account linking. Do not merge accounts solely because two providers return an unverified email.

## Test matrix

- Anonymous requests: 401 for protected APIs, safe public pages.
- Valid user, wrong tenant/resource: 403 or masked 404 as your policy requires.
- Login callback: accepted only with valid provider state; errors return safely without leaking details.
- Logout: browser cookie removed; server-side credentials revoked if relevant.
- Role changes and account suspension: permissions reflect current policy.
- Broken/expired/oversized session cookie: safe error or logged-out state.
- Multi-replica deployment: every replica recognizes sessions when using the same runtime secret.
- Reverse proxy HTTPS: cookie remains Secure even if the application receives proxied HTTP.
