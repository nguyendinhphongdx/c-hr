---
title: C-HR frontend deployment
description: Environments, secrets, CI/CD, rollout/rollback cho FE.
tags: [project, deployment, ci, ops, c-hr]
---

# C-HR frontend deployment

> **TBD**. Project mới khởi động. Section dưới là skeleton, fill khi setup môi trường thật.

## Environments

| Env | URL | Branch | Auto-deploy | Notes |
| --- | --- | --- | --- | --- |
| dev (local) | `http://localhost:3000` | n/a | `./scripts/dev.sh dev frontend` | BE expect ở `:8000/api/v1` |
| staging | TBD | TBD | TBD | TBD |
| prod | TBD | TBD | TBD | TBD |

## Secrets / env

FE chỉ public env (`NEXT_PUBLIC_*`) — không có secret runtime.

| Var | Source | Rotation |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Platform env | n/a |
| `NEXT_PUBLIC_API_URL` | Platform env | n/a |

Lưu ý: `NEXT_PUBLIC_*` được inline vào bundle lúc build → đổi giá trị cần rebuild.

## CI/CD

- **CI**: TBD
- **Build**:

```bash
pnpm install --frozen-lockfile
pnpm --filter @c-hr/frontend check
pnpm --filter @c-hr/frontend build
```

- **Deploy**: TBD (Vercel / Cloudflare Pages / Docker → ECS / …).

## Rollout

TBD. Edge case:

- Service Worker / PWA cache có thể giữ bundle cũ — cần versioning rõ.
- Cookie domain phải match BE; nếu FE và BE khác domain → BE đặt `COOKIE_SAMESITE=none; secure`.

## Rollback

TBD. Đa số platform (Vercel, …) cho phép re-promote previous deploy. FE rollback nhanh, không động DB.
