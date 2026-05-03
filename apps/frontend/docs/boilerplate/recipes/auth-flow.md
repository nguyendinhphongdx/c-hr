---
title: Auth flow
description: How cookies + middleware + axios refresh interceptor + TanStack Query work together.
tags: [recipe, auth, cookies, middleware, jwt]
---

# Auth flow

## Overview

```text
            cookie present?
browser ───────────► middleware.ts (edge)
                       │ NO  → redirect /login?next=…
                       │ YES → continue
                       ▼
                 RSC route renders
                       │
                       ▼
                 client hydrates
                       │
        TanStack Query ▼
              GET /auth/me  ──► apiClient (axios, withCredentials)
                                       │ 401?
                                       │  └─► /auth/refresh (deduped)
                                       │           ok? retry original
                                       │           fail? redirect /login
                                       ▼
                                  user data → useAuth() hook
```

**Trust model**: middleware does a presence check on the session cookie (configurable via `NEXT_PUBLIC_SESSION_COOKIE`). Token VALIDITY is enforced by the backend on every API call. The frontend never decodes/validates tokens — that's not its job.

## Files involved

| File | Role |
| --- | --- |
| [src/middleware.ts](../../../src/middleware.ts) | Edge gate — redirect unauthenticated requests before the app shell renders |
| [src/lib/api/client.ts](../../../src/lib/api/client.ts) | axios instance + refresh-token interceptor |
| [src/features/auth/services/authService.ts](../../../src/features/auth/services/authService.ts) | All `/auth/*` HTTP calls |
| [src/features/auth/hooks/useAuth.ts](../../../src/features/auth/hooks/useAuth.ts) | TanStack Query hooks: `useAuth`, `useLogin`, `useLogout`, `useVerifyOtp`, … |
| [src/components/layout/AuthGuard.tsx](../../../src/components/layout/AuthGuard.tsx) | Client-side anti-flicker guard |

## Endpoints (assumed BE contract)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Create account, set session cookie |
| `POST` | `/auth/login` | Set session cookie |
| `POST` | `/auth/logout` | Clear session cookie |
| `POST` | `/auth/refresh` | Rotate session cookie (called by interceptor) |
| `GET`  | `/auth/me` | Return current user |
| `POST` | `/auth/forgot-password` | Send reset email (always 200) |
| `POST` | `/auth/reset-password` | Apply reset with token |
| `POST` | `/auth/verify-email` | Confirm email link |
| `POST` | `/auth/verify-email/resend` | Resend email link |
| `POST` | `/auth/verify-otp` | Verify 6-digit OTP (channel-agnostic) |
| `POST` | `/auth/verify-otp/resend` | Resend OTP |
| `POST` | `/auth/change-password` | Change password (authenticated) |
| `PATCH` | `/auth/me` | Update profile |
| `GET`  | `/auth/oauth/:provider/start` | OAuth redirect (full-page navigation) |

## OTP — email or SMS, channel-agnostic

The boilerplate ships with `/verify-otp` route + `VerifyOtpView` that uses shadcn's `<InputOTP>` (6 slots). The frontend doesn't care whether the BE sent the code via email or SMS — same endpoint, same UX. The query string `?to=<destination>` (passed by the BE redirect) is shown as a "we sent the code to X" hint.

```tsx
// /verify-otp?to=ada%40example.com
<VerifyOtpView destination="ada@example.com" />
```

Auto-submits when 6 digits are filled. Resend has a 60s cooldown.

## Adding role-based access (RBAC)

The boilerplate doesn't include roles. To add:

1. Extend `User` type in `src/features/auth/types/index.ts` with `role: "admin" | "user"`.
2. Create a `<RoleGuard role="admin">` client component that reads `useAuth()` and gates children.
3. Wrap admin-only views with it, or lift the check into a per-segment layout under `(admin)/`.
4. **Important**: also enforce on the BE. Frontend gates are UX, not security.

## Adding a new auth endpoint

1. Add types to `src/features/auth/types/index.ts`.
2. Add a method to `authService` in `src/features/auth/services/authService.ts`.
3. Add a TanStack Query hook in `src/features/auth/hooks/useAuth.ts`.
4. Re-export from `src/features/auth/index.ts`.
5. Build the view in `src/features/auth/views/`.

Mirror `useVerifyOtp` / `VerifyOtpView` for the canonical pattern.

## Cross-site cookies (FE on different domain than BE)

Update env:

```bash
NEXT_PUBLIC_API_URL=https://api.your-app.com
```

BE side (out of scope here, but for reference):

- Set cookies with `SameSite=None; Secure`
- `Access-Control-Allow-Credentials: true` on every response
- `Access-Control-Allow-Origin` echoes the FE origin (no `*`)

## Common pitfalls

- **Middleware matcher too broad**: don't include `/(auth)/*` — those need to be public. Current matcher: `/home/:path*`, `/settings/:path*`.
- **`apiClient.defaults.baseURL` ending in `/api`**: keep service paths starting with `/auth/...`, not `/api/auth/...`.
- **`refreshFailed` not reset after re-login**: `useLogout` calls `resetSession()` to clear the flag. If you skip the logout (e.g. session expired in another tab), reload the page.
- **OAuth callback not landing on `/home`**: the BE should set the cookie and 302 to `/home`. The frontend never handles the OAuth code itself.
