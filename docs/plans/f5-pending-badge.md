---
title: F5 — Sidebar pending-count badge
description: Hiển thị số đơn cần duyệt cạnh menu "Requests" trong sidebar. BE đã có endpoint, FE polling + render badge.
tags: [plan, requests, ui, polish]
---

# F5 — Pending count badge

**Trạng thái**: 📋 chưa làm. BE [`request.repository.countPendingByApprover`](../../apps/backend/src/apps/requests/request/request.repository.ts) đã có; FE chưa nối.
**Trigger**: nhỏ — UX polish. ~½ ngày.
**Blocked-by**: F5 ✅ done.

## BE deliverables

- [ ] Verify endpoint `GET /requests/pending-count` (hoặc thêm vào existing `GET /requests` qua query `?countOnly=true`). Response shape:
  ```json
  { "count": 3, "byGroup": { "leave": 2, "ot": 1 } }
  ```
- [ ] Filter `WHERE approver_id = currentUserEmployeeId AND status = 'PENDING'`. Tenant-scoped.
- [ ] Cache Redis `pending-count:${employeeId}` TTL 30s. Invalidate qua event `request.created/approved/rejected/cancelled` cho approver liên quan.

## FE deliverables

- `features/requests/hooks/usePendingCount.ts` — TanStack Query với `refetchInterval: 60000` (1 phút polling) + invalidate khi user vừa approve/reject (đã có mutation).
- `components/layout/AppSidebar.tsx` — bên cạnh nav item "Requests" render `<Badge>{count}</Badge>` nếu count > 0. Component shadcn Badge variant `destructive` cho count > 0.
- Hide badge khi count = 0 hoặc loading.

## Smoke

- [ ] Login user B (approver) → sidebar show "Requests (3)".
- [ ] User A tạo đơn mới với approver=B → sau 60s (hoặc invalidate manual) badge → 4.
- [ ] B approve 1 đơn → badge → 3 ngay (mutation invalidate, không chờ poll).
- [ ] User C (không có pending) → không thấy badge.

## Done-when

- BE endpoint trả đúng count.
- FE badge render + auto-update.
- Tenant isolation: B Org A không thấy count đơn Org B.

## Defers

- **Real-time WS update** thay polling — [roadmap.md F7.7](roadmap.md#f77).
- **Per-group breakdown** (badge tách Leave/OT/…) — chỉ tổng v1.
