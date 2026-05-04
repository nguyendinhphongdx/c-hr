---
title: Environment variables
description: Every env var the app reads, what it does, and where it's consumed.
tags: [reference, env, config]
---

# Environment variables

All `NEXT_PUBLIC_*` vars are inlined at build time. Server-only vars (no prefix) are only available during SSR / server actions / route handlers.

The canonical template is [.env.example](../../../apps/frontend/.env.example). This doc explains *why* each value matters.

## Public (browser-exposed)

| Var | Default | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Base URL for canonical metadata, OpenGraph, sitemap, JSON-LD. **Required** in production. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | axios `baseURL` for the BE. Used in `src/lib/api/client.ts`. |
| `NEXT_PUBLIC_SESSION_COOKIE` | `session` | Cookie name middleware checks for. Match what your BE sets. |

## Where they're consumed

| Var | File |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | [src/lib/seo/site.ts](../../../apps/frontend/src/lib/seo/site.ts) |
| `NEXT_PUBLIC_API_URL` | [src/lib/api/client.ts](../../../apps/frontend/src/lib/api/client.ts) |
| `NEXT_PUBLIC_SESSION_COOKIE` | [src/middleware.ts](../../../apps/frontend/src/middleware.ts) |

## Adding a new env var

1. **Public** (needed in browser): name it `NEXT_PUBLIC_FOO` and read it in code with a fallback (`process.env.NEXT_PUBLIC_FOO ?? "default"`).
2. **Server-only** (secret): name it `FOO` (no prefix). Only available in server components / route handlers / server actions.
3. **Document here** with default + where it's read.
4. **Add to `.env.example`** so new contributors know it exists.
5. **Don't read `process.env.X` directly inside components.** Centralize via a config file (`src/lib/seo/site.ts` for site-wide values).

## Production checklist

- [ ] `NEXT_PUBLIC_SITE_URL` set to the real domain (no trailing slash)
- [ ] `NEXT_PUBLIC_API_URL` points to production BE (HTTPS)
- [ ] `NEXT_PUBLIC_SESSION_COOKIE` matches the BE-set cookie name
- [ ] All server-only secrets injected via your platform (Vercel env vars, Docker secrets, etc.)
- [ ] No `.env` / `.env.local` committed to the repo (already gitignored)
