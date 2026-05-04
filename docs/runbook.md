---
title: C-HR runbook
description: On-call procedures, common alerts, debug commands cho cả backend và frontend C-HR.
tags: [project, ops, runbook, on-call, c-hr]
---

# C-HR runbook

> Project đang ở giai đoạn setup. Phần ops thật sẽ fill khi có môi trường staging/prod đầu tiên. Hiện chỉ ghi structure + các check local cho cả 2 app.

## Health checks

| Endpoint | App | Expected | Alarm if |
| --- | --- | --- | --- |
| `GET /api/v1/health` | backend | `200 { status: "ok" }` | non-200 quá 1 phút |
| `GET /` | frontend | `200`, landing page render | non-200 quá 1 phút |

## Local debug

### Common (root)

```bash
./scripts/dev.sh status                    # docker compose ps
./scripts/dev.sh logs backend              # tail BE logs
./scripts/dev.sh logs postgres
./scripts/dev.sh logs redis
./scripts/dev.sh shell backend             # exec sh trong BE container
```

### Backend

```bash
./scripts/dev.sh prisma studio              # GUI cho DB local
./scripts/dev.sh migrate                    # migrate dev
pnpm --filter @c-hr/backend test
```

### Frontend

```bash
./scripts/dev.sh dev frontend              # next dev :3000 (native)
pnpm --filter @c-hr/frontend check         # lint + typecheck
pnpm --filter @c-hr/frontend build         # production build local
```

Browser tools cho FE:

- React Query Devtools (toggle floating button) cho query cache.
- Network tab: kiểm tra `Cookie: access_token=...; refresh_token=...` được carry kèm request `/api/v1/*`.
- Console: lỗi axios interceptor (refresh-token loop) sẽ log ra.

## Common alerts (template — fill khi có prod)

### "DB connection failures" (BE)

- **Likely cause**: DB host unreachable, credentials rotated, pool exhausted.
- **Steps**:
  1. Check BE logs grep `prisma`.
  2. Verify `DATABASE_URL` trong env của pod.
  3. Check connection count phía Postgres.
- **Mitigation**: bounce pods, scale DB nếu pool maxed.

### "Auth 401 spike" (BE + FE)

- **Likely cause**: secret rotation phá token cũ, cookie domain mismatch, hoặc clock skew.
- **Steps**:
  1. `JWT_ACCESS_SECRET` có vừa thay không?
  2. Tên cookie BE-set có khớp `AUTH_ACCESS_COOKIE_NAME` / `AUTH_REFRESH_COOKIE_NAME` không.
  3. Inspect `Set-Cookie` headers ở browser.
  4. So sánh server clock với NTP.
  5. Cookie domain config có khớp với FE domain không.

### "BE 5xx spike" (FE side observation)

- **Likely cause**: BE deploy fail, DB unreachable, hoặc upstream service degraded.
- **Steps**:
  1. Check BE logs / status page.
  2. Verify `NEXT_PUBLIC_API_URL` reachable từ client (Network tab).
  3. Tìm refresh-token loop trong console (`apiClient` interceptor).
- **Mitigation**: rollback BE — TanStack Query sẽ retry tự động.

### "Hydration mismatch" (FE)

- **Likely cause**: RSC render khác client render (date/time format theo timezone, random ID, theme từ localStorage…).
- **Steps**:
  1. Đặt timezone format ở Org level, KHÔNG dùng browser timezone trực tiếp trong RSC.
  2. Theme provider phải avoid SSR theme (next-themes có flag).

### "Payroll job failed" (BE)

- **TBD** khi implement payroll module — cần log job ID, period, employee count.

## Useful commands (prod — TBD)

```bash
# Tail prod logs
TBD

# Connect to prod DB (read-only)
TBD

# Replay a failed job
pnpm --filter @c-hr/backend cli <name> ...
```

## Escalation

- L1 (on-call): TBD
- L2 (team lead): TBD
- L3 (DB / infra): TBD
