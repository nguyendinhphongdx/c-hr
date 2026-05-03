---
title: C-HR backend deployment
description: Environments, secrets, CI/CD, rollout/rollback cho BE.
tags: [project, deployment, ci, ops, c-hr]
---

# C-HR backend deployment

> **TBD**. Project mới khởi động — chưa có pipeline. Section dưới là skeleton, fill khi setup môi trường thật.

## Environments

| Env | URL | Branch | Auto-deploy | Notes |
| --- | --- | --- | --- | --- |
| dev (local) | `http://localhost:8000` | n/a | `./scripts/dev.sh dev backend` | Postgres + Redis qua Docker |
| staging | TBD | TBD | TBD | TBD |
| prod | TBD | TBD | TBD | TBD |

## Secrets

| Secret | Source | Rotation cadence |
| --- | --- | --- |
| `DATABASE_URL` | TBD | TBD |
| `JWT_ACCESS_SECRET` | TBD | TBD |
| `JWT_REFRESH_SECRET` | TBD | TBD |
| `REDIS_PASSWORD` | TBD | TBD |
| `ADMIN_PASSWORD` (initial seed) | TBD | one-time |

Phải đảm bảo: **không** commit secret thật vào repo. `.env` gitignored, `.env.example` chỉ chứa placeholder.

## CI/CD

- **CI**: TBD (GitHub Actions / GitLab CI / …)
- **Build**:

```bash
pnpm install --frozen-lockfile
pnpm --filter @c-hr/backend build
docker build -t c-hr-backend ./apps/backend
```

- **Deploy**: TBD (ECS / k8s / Fly.io / Railway / …)

## Rollout

TBD. Khi có deploy thật, ghi step-by-step:

1. Tag release `vX.Y.Z`
2. CI build image, push lên registry
3. Migrate DB (`prisma migrate deploy` — KHÔNG dùng `migrate dev` trên prod)
4. Rolling update pods
5. Smoke test `/api/v1/health`

## Rollback

TBD. Lưu ý:

- Migration đã apply không tự rollback — phải có forward migration sửa schema.
- Cookie cũ vẫn valid sau rollback nếu JWT secret không đổi.
