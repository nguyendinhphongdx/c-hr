---
title: Auth & cookies
description: How JWT + httpOnly cookies + Bearer fallback work, and how to extend.
tags: [recipe, auth, jwt, cookies]
---

# Auth & cookies

## Flow at a glance

```
POST /auth/login
  ↳ AuthService.login() verifies credentials, signs accessToken + refreshToken
  ↳ Controller calls setAuthCookies(res, tokens, configService)
     - res.cookie('access_token', ..., { httpOnly, secure, sameSite, domain, maxAge })
     - res.cookie('refresh_token', ..., { ... refresh maxAge })
  ↳ Response also returns { user, accessToken, refreshToken } in body so non-cookie
    clients (mobile, server-to-server) can extract them.
```

For subsequent requests:

```
Any authenticated route:
  ↳ JwtAuthGuard runs JwtStrategy
  ↳ Strategy extracts token via cookieOrBearerExtractor:
     1. req.cookies[AUTH_ACCESS_COOKIE_NAME] (default 'access_token')
     2. Authorization: Bearer <token>      (fallback for non-browser clients)
  ↳ Strategy verifies signature, looks up user in DB, returns RequestUser
  ↳ Guard sets userId/sessionId in RequestContext (nestjs-cls)
```

## Refresh

```
POST /auth/refresh
  ↳ Controller reads refreshToken from body OR refresh_token cookie
  ↳ AuthService.refresh() verifies refresh signature, signs new pair
  ↳ Controller re-sets cookies via setAuthCookies()
```

## Logout

```
POST /auth/logout
  ↳ Controller calls clearAuthCookies(res, configService) — clears both cookies
  ↳ Tokens remain valid until expiry (stateless JWT). For real revocation,
    add a server-side session/blacklist (Redis) and check it in JwtStrategy.
```

## Cookie configuration

All cookie behavior is driven by env vars in [src/config/auth.config.ts](../../../apps/backend/src/config/auth.config.ts):

| Env var | Default | Notes |
| --- | --- | --- |
| `AUTH_ACCESS_COOKIE_NAME` | `access_token` | |
| `AUTH_REFRESH_COOKIE_NAME` | `refresh_token` | |
| `COOKIE_DOMAIN` | unset | Set to `.example.com` to share across subdomains |
| `COOKIE_SECURE` | `true` in prod, `false` otherwise | Override with `'true'` / `'false'` |
| `COOKIE_SAMESITE` | `lax` | `lax` \| `strict` \| `none` |
| `JWT_ACCESS_EXPIRATION` | `15m` | Drives both JWT exp and access cookie maxAge |
| `JWT_REFRESH_EXPIRATION` | `7d` | Drives both JWT exp and refresh cookie maxAge |

### Cross-site setup

If FE and BE live on different sites (e.g. `app.example.com` and `api.other.com`):

```
COOKIE_SAMESITE=none
COOKIE_SECURE=true   # required when SameSite=None
CORS_ORIGIN=https://app.example.com
```

CORS credentials are already enabled in [src/main.ts](../../../apps/backend/src/main.ts).

## Extending

### Add a new context field

Want to carry `tenantId` through the request after auth?

1. Extend `RequestContextData` in [src/common/context/request-context.service.ts](../../../apps/backend/src/common/context/request-context.service.ts).
2. Add a getter (`get tenantId()`).
3. Set it in `JwtAuthGuard.handleRequest()` (or in a downstream guard like a `TenantGuard`).
4. Read anywhere via `contextService.tenantId`.

### Add roles / RBAC

The boilerplate includes `User.role` (`ADMIN` | `USER`) but not a `RolesGuard`. To add one:

1. Create `src/common/guards/roles.guard.ts` reading `Reflector.getAllAndOverride('roles', ...)`.
2. Create a `@Roles(...UserRole)` decorator.
3. Apply on routes: `@UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)`.

For typed errors that the FE can route on, throw `AccessException(AccessErrorCode.INSUFFICIENT_ROLE, { ... })` instead of generic `ForbiddenException`.

### Revoke tokens (real logout)

JWTs are stateless. To revoke before expiry:

1. Add a Redis-backed session store. Key: `session:<sessionId>`, value: `userId`, TTL = refresh expiration.
2. On login, write the session.
3. In `JwtStrategy.validate()`, check the session exists (extra Redis read, but cheap).
4. On logout, delete the session and clear cookies.

This adds one Redis round-trip per authenticated request — usually fine for the security gain.

## Common pitfalls

- **`SameSite=None` without `Secure=true`** — browsers silently reject the cookie.
- **Cookie domain mismatch** — `.example.com` works for subdomains; `example.com` doesn't.
- **CORS without `credentials: true`** — browser doesn't attach cookies. The boilerplate already sets this; just ensure `CORS_ORIGIN` doesn't include `*` (incompatible with credentials).
- **Test clients ignoring `Set-Cookie`** — for Postman, enable cookie jar; for curl, use `-c cookie.txt -b cookie.txt`.
