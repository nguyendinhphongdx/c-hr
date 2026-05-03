---
title: C-HR frontend runbook
description: On-call procedures, common alerts cho FE C-HR.
tags: [project, ops, runbook, on-call, c-hr]
---

# C-HR frontend runbook

> Project đang ở giai đoạn setup. Phần ops thật fill sau khi có môi trường staging/prod đầu tiên.

## Health checks

| Endpoint | Expected | Alarm if |
| --- | --- | --- |
| `GET /` | `200`, landing page render | non-200 quá 1 phút |
| BE `GET /api/v1/health` | `200 { status: "ok" }` | non-200 quá 1 phút |

## Local debug

```bash
# Từ root C-HR
./scripts/dev.sh dev frontend              # next dev :3000
pnpm --filter @c-hr/frontend check         # lint + typecheck
pnpm --filter @c-hr/frontend build         # production build local
```

Browser:
- React Query Devtools (toggle floating button) cho query cache
- Network tab: kiểm tra `Cookie: access_token=...; refresh_token=...` được carry kèm request `/api/v1/*`
- Console: lỗi axios interceptor (refresh-token loop) sẽ log ra

## Common alerts

### "BE 5xx spike"

- **Likely cause**: BE deploy fail, DB unreachable, hoặc upstream service degraded.
- **Steps**:
  1. Check BE logs / status page
  2. Verify `NEXT_PUBLIC_API_URL` reachable từ client (Network tab)
  3. Tìm refresh-token loop trong console (`apiClient` interceptor)
- **Mitigation**: rollback BE — TanStack Query sẽ retry tự động.

### "Auth 401 storm"

- **Likely cause**: BE rotated session secret, cookie domain mismatch, hoặc clock skew.
- **Steps**:
  1. Tên cookie BE-set có khớp `AUTH_ACCESS_COOKIE_NAME` / `AUTH_REFRESH_COOKIE_NAME` không
  2. Inspect `Set-Cookie` headers ở browser
  3. Verify server clock NTP

### "Hydration mismatch"

- **Likely cause**: RSC render khác client render (date/time format theo timezone, random ID, theme từ localStorage…).
- **Steps**:
  1. Đặt timezone format ở Org level, KHÔNG dùng browser timezone trực tiếp trong RSC
  2. Theme provider phải avoid SSR theme (next-themes có flag)

## Useful commands

```bash
pnpm --filter @c-hr/frontend dev
pnpm --filter @c-hr/frontend build && pnpm --filter @c-hr/frontend start
pnpm --filter @c-hr/frontend check
```

## Escalation

- L1 (on-call): TBD
- L2 (team lead): TBD
- L3 (infra / BE): TBD
