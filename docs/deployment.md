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
| staging | both | TBD | TBD | TBD | TBD |
| prod | both | TBD | TBD | TBD | TBD |

## Secrets

### Backend

| Secret | Source | Rotation cadence |
| --- | --- | --- |
| `DATABASE_URL` | TBD | TBD |
| `JWT_ACCESS_SECRET` | TBD | TBD |
| `JWT_REFRESH_SECRET` | TBD | TBD |
| `REDIS_PASSWORD` | TBD | TBD |
| `ADMIN_PASSWORD` (initial seed) | TBD | one-time |

### Frontend

FE chỉ public env (`NEXT_PUBLIC_*`) — không có secret runtime.

| Var | Source | Rotation |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Platform env | n/a |
| `NEXT_PUBLIC_API_URL` | Platform env | n/a |

Lưu ý: `NEXT_PUBLIC_*` được inline vào bundle lúc build → đổi giá trị cần rebuild.

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
