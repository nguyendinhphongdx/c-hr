---
title: F5 — Leave-balance entity + deduct on approve
description: Cộng dồn phép theo policy + deduct khi approve leave request. Thay no-op handler trong side-effects/registry.
tags: [plan, requests, leave, accrual]
---

# F5 — Leave-balance

**Trạng thái**: 📋 chưa làm. Side-effect `leave` hiện no-op (xem [registry.ts](../../apps/backend/src/apps/requests/side-effects/registry.ts)).
**Trigger**: business cần track quota phép. Quan trọng cho compliance.
**Blocked-by**: F5 ✅ done.

## Phạm vi MVP

- 1 loại quota: **annual leave (phép năm)** với accrual đơn giản: `n ngày/tháng`, reset đầu năm hoặc carry-over N ngày.
- Sick leave / unpaid / maternity → **không deduct quota** v1 (handler track lịch sử, không deduct).
- Half-day support (deduct 0.5).

## Schema

```prisma
enum LeaveBalanceType { ANNUAL SICK }   // mở rộng sau

model LeaveBalance {
  id             String           @id @default(uuid())
  organizationId String           @map("organization_id")
  employeeId     String           @map("employee_id")
  type           LeaveBalanceType
  /// Năm tài khoá (vd 2026). Mỗi năm 1 row per (employee, type).
  year           Int

  /// Tổng quota được cấp (sau accrual + carry-over)
  totalDays      Float            @map("total_days")
  /// Đã dùng (deducted)
  usedDays       Float            @default(0) @map("used_days")
  /// Pending (đơn approved nhưng chưa qua ngày)
  reservedDays   Float            @default(0) @map("reserved_days")

  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt      @map("updated_at")

  employee       Employee         @relation(fields: [employeeId], references: [id])
  @@unique([employeeId, type, year])
  @@index([organizationId, year])
  @@map("leave_balances")
}

model LeaveAccrualPolicy {
  id              String  @id @default(uuid())
  organizationId  String  @unique @map("organization_id")
  /// Số ngày tích luỹ mỗi tháng (vd 1 = 12 ngày/năm)
  daysPerMonth    Float   @map("days_per_month")
  /// Carry-over tối đa từ năm trước (0 = không cho)
  carryOverMaxDays Float  @map("carry_over_max_days")
  /// Effective từ tháng nào sau hire (vd 3 = sau 3 tháng thử việc)
  effectiveAfterMonths Int @default(0) @map("effective_after_months")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt      @map("updated_at")
  @@map("leave_accrual_policies")
}
```

Migration: `add_leave_balance_and_policy`.

## BE — Logic

### Accrual job

`@Cron('0 0 1 * *')` — đầu tháng:
- Per Org có `LeaveAccrualPolicy`:
  - For each ACTIVE employee đã qua `effectiveAfterMonths`:
    - Upsert `LeaveBalance(year=currentYear, type=ANNUAL)`: `totalDays += policy.daysPerMonth`.

`@Cron('0 0 1 1 *')` — đầu năm:
- Per employee: tạo balance row năm mới với `totalDays = min(prev.remaining, policy.carryOverMaxDays)`.

### Side-effect handler `leave`

Mở rộng [side-effects/registry.ts](../../apps/backend/src/apps/requests/side-effects/registry.ts):

```ts
leave: {
  onApprove: async (request, ctx) => {
    const days = computeLeaveDays(request.data.fromDate, request.data.toDate, request.data.halfDay);
    const type = mapLeaveTypeToBalanceType(request.data.leaveType);
    if (!type) return; // SICK/MATERNITY/UNPAID — track only, no deduct
    const balance = await ctx.balanceRepo.findOrThrow({
      employeeId: request.requesterId,
      type, year: yearOf(request.data.fromDate),
    });
    if (balance.totalDays - balance.usedDays - balance.reservedDays < days) {
      throw new BadRequestException(`Không đủ phép — còn ${balance.totalDays - balance.usedDays - balance.reservedDays} ngày`);
    }
    await ctx.balanceRepo.deduct(balance.id, days);  // usedDays += days
    ctx.activities.log({
      action: 'leave.balance_deducted',
      objectType: 'Request', objectId: request.id,
      metadata: { days, balanceId: balance.id, remaining: ... },
    });
  },
  onCancel: async (request, ctx) => {
    if (request.status === 'APPROVED') {
      // Restore balance
      await ctx.balanceRepo.restore(...);
    }
  },
}
```

Validate **trước approve** (không sau): nếu insufficient → reject với lý do, không lưu APPROVED rồi rollback (UX dở).

→ Mở rộng `RequestService.approve`: gọi `sideEffectRegistry[group.code].validate?.(request, ctx)` trước khi update status. Nếu throw → 400, không touch DB.

### Endpoints

```text
GET  /leave-balances?employeeId=&year=     — chính mình + HR
GET  /leave-balances/me                    — shortcut
PATCH /leave-balances/:id                  — HR adjust thủ công (audit)
GET  /leave-accrual-policies               — admin Org
PATCH /leave-accrual-policies              — admin Org
```

## FE deliverables

- `features/leave-balance/`:
  - `LeaveBalanceCard.tsx` — render trên `/dashboard` cho user thường: "Phép còn lại: 12.5 / 15 ngày".
  - `LeaveBalanceTableView.tsx` — `/settings/leave-balances` cho HR xem all employee, edit thủ công.
  - `LeaveAccrualPolicyForm.tsx` — `/settings/leave-policy` cho admin Org cấu hình.
- Trên `RequestCreateDialog` group=leave: hiển thị balance preview "Bạn còn 12.5 ngày, đơn này dùng 3 → còn lại 9.5". Block submit nếu insufficient.

## Smoke E2E

- [ ] Admin Org PATCH policy `daysPerMonth: 1, carryOverMaxDays: 5`.
- [ ] Run accrual job manually → balance row tạo cho mỗi employee active, `totalDays = currentMonth × 1`.
- [ ] Employee A có 12 ngày, tạo leave 3 ngày → balance preview 9 còn lại.
- [ ] Approve → `usedDays += 3`, activity `leave.balance_deducted`.
- [ ] Cancel approved leave → restore.
- [ ] Tạo leave 100 ngày khi chỉ còn 12 → approve fail "Không đủ phép".
- [ ] HR PATCH manual `+5` → balance update, audit `LEAVE_BALANCE_ADJUST`.
- [ ] Sang năm mới: cron tạo balance new year với carry-over min(remaining, 5).

## Done-when

- BE build + migrations.
- 1 năm fiscal full cycle: accrual mỗi tháng + deduct khi approve + reset đầu năm.
- FE balance card hiện trên dashboard.
- HR adjust audit log đúng.

## Defers

- **Multi-policy per Org** (vd manager 18 ngày, junior 12 ngày) — defer, hiện chỉ 1 policy/Org.
- **Half-day half-balance** edge case (timezone-sensitive) — defer.
- **Maternity/paternity quota** với rule riêng — defer.
- **Leave forecast** ("Cuối năm bạn sẽ có X ngày") — defer.
- **Negative balance** (cho mượn) — không hỗ trợ v1.
