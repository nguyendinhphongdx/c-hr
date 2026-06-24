---
title: C-HR deployment
description: Environments, secrets, CI/CD, rollout/rollback cho cả backend và frontend.
tags: [project, deployment, ci, ops, c-hr]
---

# C-HR deployment

> **TBD**. Project mới khởi động — chưa có pipeline. Section dưới là skeleton, fill khi setup môi trường thật.

## Environments

| Env | App | URL | Branch | Auto-deploy | Notes |
| --- | --- | --- | --- | --- | --- |
| dev (local) | backend | `http://localhost:8000` | n/a | `./scripts/dev.sh dev backend` | Postgres + Redis qua Docker |
| dev (local) | frontend | `http://localhost:3000` | n/a | `./scripts/dev.sh dev frontend` | BE expect ở `:8000/api/v1` |
| staging | both | TBD | TBD | TBD | Shared origin; `/api/*` routes to backend |
| prod | both | `http://hrm.cmcai.vn` | `main` | TBD | Internal DNS, HTTP until internal TLS is configured |

## Secrets

### Backend

| Secret | Source | Rotation cadence |
| --- | --- | --- |
| `DATABASE_URL` | TBD | TBD |
| `JWT_ACCESS_SECRET` | TBD | TBD |
| `JWT_REFRESH_SECRET` | TBD | TBD |
| `REDIS_PASSWORD` | TBD | TBD |
| `ADMIN_PASSWORD` (initial seed) | TBD | one-time |

### Public URL

Docker Compose derives frontend runtime URLs from two public origins:

| Var | Source | Rotation |
| --- | --- | --- |
| `API_BASE_URL` | `.env` / platform env | n/a |
| `FRONTEND_URL` | `.env` / platform env | n/a |

```env
API_BASE_URL=http://hrm.cmcai.vn
FRONTEND_URL=http://hrm.cmcai.vn
```

Compose maps these values into `CORS_ORIGIN`, `NEXT_PUBLIC_SITE_URL`, and
`NEXT_PUBLIC_API_URL`. Traefik additionally needs hostname-only
`API_HOST` and `FRONTEND_HOST` because its `Host()` matcher does not accept
origins containing `http://` or `https://`.
`next-runtime-env` reads the frontend values at runtime, so changing the
origin does not require rebuilding the frontend image.

When TLS is available, switch both public origins to `https://...` and set
`COOKIE_SECURE=true`.

Phải đảm bảo: **không** commit secret thật vào repo. `.env*` gitignored, `.env.example` chỉ chứa placeholder.

## CI/CD

- **CI**: TBD (GitHub Actions / GitLab CI / …).
- **Build**:

```bash
pnpm install --frozen-lockfile

# Backend
pnpm --filter @c-hr/backend build
docker build -t c-hr-backend ./apps/backend

# Frontend
pnpm --filter @c-hr/frontend check
pnpm --filter @c-hr/frontend build
```

- **Deploy BE**: TBD (ECS / k8s / Fly.io / Railway / …).
- **Deploy FE**: TBD (Vercel / Cloudflare Pages / Docker → ECS / …).

## Rollout

TBD. Khi có deploy thật, ghi step-by-step:

### Backend rollout

1. Tag release `vX.Y.Z`.
2. CI build image, push lên registry.
3. Migrate DB (`prisma migrate deploy` — KHÔNG dùng `migrate dev` trên prod).
4. Rolling update pods.
5. Smoke test `/api/v1/health`.

### Frontend rollout

- Service Worker / PWA cache có thể giữ bundle cũ — cần versioning rõ.
- Cookie domain phải match BE; nếu FE và BE khác domain → BE đặt `COOKIE_SAMESITE=none; secure`.

## Rollback

TBD. Lưu ý chung:

- **BE**: migration đã apply không tự rollback — phải có forward migration sửa schema. Cookie cũ vẫn valid sau rollback nếu JWT secret không đổi.
- **FE**: đa số platform (Vercel, …) cho phép re-promote previous deploy. FE rollback nhanh, không động DB.
