---
title: C-HR backend runbook
description: On-call procedures, common alerts, debug commands cho BE C-HR.
tags: [project, ops, runbook, on-call, c-hr]
---

# C-HR backend runbook

> Project đang ở giai đoạn setup. Phần ops thật sẽ fill khi có môi trường staging/prod đầu tiên. Hiện chỉ ghi structure + các check local.

## Health checks

| Endpoint | Expected | Alarm if |
| --- | --- | --- |
| `GET /api/v1/health` | `200 { status: "ok" }` | non-200 quá 1 phút |

## Local debug

```bash
# Từ root C-HR
./scripts/dev.sh status                    # docker compose ps
./scripts/dev.sh logs backend              # tail BE logs
./scripts/dev.sh logs postgres
./scripts/dev.sh logs redis
./scripts/dev.sh shell backend             # exec sh trong BE container

# Prisma
./scripts/dev.sh prisma studio              # GUI cho DB local
./scripts/dev.sh migrate                    # migrate dev
```

## Common alerts (template — fill khi có prod)

### "DB connection failures"

- **Likely cause**: DB host unreachable, credentials rotated, pool exhausted.
- **Steps**:
  1. Check BE logs grep `prisma`
  2. Verify `DATABASE_URL` trong env của pod
  3. Check connection count phía Postgres
- **Mitigation**: bounce pods, scale DB nếu pool maxed.

### "Auth 401 spike"

- **Likely cause**: secret rotation phá token cũ, hoặc clock skew.
- **Steps**:
  1. `JWT_ACCESS_SECRET` có vừa thay không?
  2. So sánh server clock với NTP
  3. Cookie domain config có khớp với FE domain không

### "Payroll job failed"

- **TBD** khi implement payroll module — cần log job ID, period, employee count.

## Useful commands

```bash
# Tail prod logs
TBD

# Connect to prod DB (read-only)
TBD

# Replay a failed job
pnpm cli <name> ...
```

## Escalation

- L1 (on-call): TBD
- L2 (team lead): TBD
- L3 (DB / infra): TBD
