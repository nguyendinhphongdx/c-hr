---
title: Architecture
description: App Router layers, RSC vs Client boundaries, auth flow, request lifecycle.
tags: [architecture, app-router, rsc, layers]
---

# Architecture

## Layers

```text
┌──────────────────────────────────────────────────────────┐
│ src/app/                  Next.js routes (RSC + Client)  │  ← composition root
├──────────────────────────────────────────────────────────┤
│ src/features/<name>/      feature modules                │  ← can depend on lib + components
├──────────────────────────────────────────────────────────┤
│ src/components/           shared UI + layout + icons     │  ← can depend on lib
├──────────────────────────────────────────────────────────┤
│ src/lib/                  api, seo, utils, types         │  ← leaf
└──────────────────────────────────────────────────────────┘
```

**Rule of thumb**: if `features/foo` imports from `features/bar`, that's a smell. Either extract the shared piece into `components/` or `lib/`, or expose it through `bar/index.ts` re-exports.

## Path alias

Single alias by design — easy to follow:

```ts
"@/*": "./src/*"
```

Everything else (e.g. `@/components/icons`, `@/lib/api/client`) is just a sub-path. Don't create more aliases.

## RSC vs Client — the cardinal rule

**Default: every component is a Server Component.** A Server Component:

- runs on the server, never ships its code to the browser
- can be `async` and read cookies/headers
- cannot use hooks (`useState`, `useEffect`, `useRef`, …) or DOM APIs
- cannot attach event handlers (no `onClick`)

Add `"use client"` only when you need ANY of those. Push the boundary as far down the tree as possible — a layout that wraps a shell-with-state should still be RSC; only the inner shell becomes client. See [src/app/(dashboard)/layout.tsx](../../apps/frontend/src/app/(dashboard)/layout.tsx) and [src/components/layout/DashboardShell.tsx](../../apps/frontend/src/components/layout/DashboardShell.tsx) for the canonical split.

## Request lifecycle (protected route)

```text
   ┌──── browser ────┐
   │                 ▼
   │     middleware.ts (edge)
   │       - read session cookie
   │       - if missing → 302 to /login?next=…
   │                 ▼
   │     Next.js renders the matched route segment
   │       - layout(s)         (RSC by default)
   │       - page              (RSC by default)
   │       - loading.tsx       (streamed fallback)
   │                 ▼
   │     ClientComponents hydrate
   │       - <Providers>: QueryClient, ThemeProvider, Tooltip, Toaster
   │       - <AuthGuard>: secondary client check + sets context
   │                 ▼
   │     Page renders
   │       - server-state via TanStack Query (`useAuth` hook)
   │       - mutations via axios → BE returns/refreshes cookies
   │                 ▼
   │     On error: nearest error.tsx boundary
   └──── browser ◄───┘
```

## Auth flow

The frontend trusts the backend for all token validation. Frontend responsibilities:

1. **`middleware.ts`** at the edge checks for a session cookie (configurable via `NEXT_PUBLIC_SESSION_COOKIE`). Missing → redirect to `/login?next=<original-path>`. Trust here is "is there a cookie at all?", not "is it valid?" — the BE enforces validity on every API call.
2. **axios `apiClient`** (`src/lib/api/client.ts`) sets `withCredentials: true` so cookies travel automatically. On a 401 response, it transparently calls `/auth/refresh` once and retries. On refresh failure, it sets `refreshFailed = true` and redirects to `/login`.
3. **`useAuth`** hook (`src/features/auth/hooks/useAuth.ts`) exposes `user / isLoading / isAuthenticated` via TanStack Query. Login/Register/Logout mutations invalidate the cache.
4. **`AuthGuard`** is a client-side flicker-prevention guard. The middleware is the real protection.

See [recipes/auth-flow.md](recipes/auth-flow.md) for extending (RBAC, OTP, OAuth callback).

## Response shape

The `apiClient` types in `src/lib/api/types.ts` define `ApiSuccess<T>` and `ApiList<T>` envelopes. The auth feature currently returns raw shapes (no envelope) — pick a convention with your backend and stay consistent.

## Per-page metadata

```ts
// app/<route>/page.tsx
export const metadata = createMetadata({ title: "…", path: "/…" });
```

`createMetadata` (`src/lib/seo/metadata.ts`) handles canonical URL, OpenGraph, Twitter card, and `noIndex` for protected routes. It reads from `SITE` (`src/lib/seo/site.ts`) — single source of truth for site-wide values.

## Error / loading / not-found

App Router conventions are wired at the root:

- [src/app/error.tsx](../../apps/frontend/src/app/error.tsx) — catches anything that bubbles up. Hook your monitoring (Sentry, etc.) here.
- [src/app/loading.tsx](../../apps/frontend/src/app/loading.tsx) — streamed fallback for slow segments.
- [src/app/not-found.tsx](../../apps/frontend/src/app/not-found.tsx) — 404 page.

Add segment-specific versions inside each route group as needed (`(dashboard)/error.tsx`, `(auth)/loading.tsx`, …).
