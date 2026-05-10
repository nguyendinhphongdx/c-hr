---
title: Roadmap — 17 mục post-MVP chưa scope chi tiết
description: Các tính năng mức "Thấp" trong gap analysis 2026-05-10. 1-liner scope + trigger + dependency. Lên plan chi tiết khi nào commit work.
tags: [project, roadmap, post-mvp]
---

# Roadmap dài hơi

Liệt kê các tính năng đã ghi nhận trong [features.md "Gap còn lại"](features.md#gap-còn-lại-sau-sync-2026-05-10) **mức Thấp** — chưa cần plan chi tiết, chỉ note scope/trigger/dep để khi business confirm sẽ promote thành plan file riêng.

> **Quy ước**: khi 1 mục được pick để làm → tách ra `docs/plans/<mục>.md` với schema/BE/FE/done-when như các plan high+medium.

## F7.6 — 2-way calendar sync {#f76}

Push event tạo ở C-HR lên Google/Microsoft. **Phức tạp**: conflict resolution last-write-wins vs source-of-truth flag, idempotency key bidirectional, webhook subscription cho remote changes.

- **Trigger**: F7.4 (1-way pull) ổn định ≥ 1 tháng + user yêu cầu.
- **Dep**: F7.4 ✅ phải done trước.
- **Scope ước tính**: 1 tuần (OAuth scope upgrade `events.write`, conflict UI, sync queue).

## F7.7 — Real-time notifications + reminders {#f77}

Replace polling-based badge / notification với WebSocket. Bao gồm:

- Event reminder X phút trước (email + WS push).
- WS khi attendee respond, comment mới, request approved.
- Bell icon real-time update.

- **Trigger**: user phàn nàn delay 60s polling.
- **Dep**: F6.3 (notification entity) + Redis Pub/Sub setup.
- **Scope**: 4-5 ngày (NestJS gateway, FE socket client, reconnect logic).

## F7.8 — Resource floor plan {#f78}

Visualize phòng họp trên sơ đồ tầng (SVG drag-drop). Click phòng → book.

- **Trigger**: ≥ 20 phòng hoặc khách hàng enterprise yêu cầu.
- **Dep**: F7.2 ✅ done.
- **Scope**: 1 tuần (svg editor, mapping room → coordinates).

## F7.9 — Multi-timezone proper {#f79}

Per-user TZ override + Org TZ + chi nhánh đa-TZ. Hiện store UTC, render qua `Organization.timezone`.

- **Trigger**: Org có chi nhánh nước ngoài.
- **Dep**: tất cả entity timestamp đã UTC ✅.
- **Scope**: 3-4 ngày + careful E2E (calendar grid, attendance status, request fromDate).

## F7.10 — Recurring exceptions UX {#f710}

Google Calendar pattern: "Chỉ sự kiện này" / "Sự kiện này và sau" / "Tất cả". Hiện plan F7 recurrence chỉ 2 option (instance/series).

- **Trigger**: F7 recurrence ([f7-recurrence.md](f7-recurrence.md)) done + user complain.
- **Dep**: F7 recurrence ✅ phải done.
- **Scope**: 2 ngày (split RRULE + UNTIL boundary).

## F7.11 — Booking approval workflow {#f711}

Phòng VIP / xe công ty cần manager approve. **Reuse F5 Request engine** với group `room_booking` thay vì direct booking.

- **Trigger**: Org có resource cần gate.
- **Dep**: F7.2 ✅ done, F5.2 form-builder done (để admin tự thêm group `room_booking`).
- **Scope**: 1-2 ngày (link Request → EventResource, side-effect tạo booking khi approve).

## F7-leave conflict {#f7-leave}

Leave approved → tự động block calendar slot, hoặc chỉ warn? Cần thiết kế UX trước khi code.

- **Trigger**: user complain "tôi nghỉ phép nhưng vẫn bị book meeting".
- **Dep**: F5 leave-balance ([f5-leave-balance.md](f5-leave-balance.md)) optional.
- **Scope**: 2 ngày (auto-create blocking event với visibility=BUSY_ONLY).

## Audit log viewer UI {#audit-viewer}

HR xem `audit_logs` qua UI thay query DB. Filter entity / actor / time / action. Khác F6.6 activity feed (cho UX) — đây là compliance tool.

- **Trigger**: yêu cầu compliance audit.
- **Dep**: F1 audit_logs ✅ done.
- **Scope**: 2 ngày (FE table + filter, BE list endpoint).

## Performance reviews {#perf-reviews}

Module mới với entities `Review`, `Goal`, `Feedback`. Cycle quý/năm. Self-eval + peer + manager.

- **Trigger**: HR yêu cầu (khá đặc thù theo Org).
- **Dep**: F2 employee ✅, F6 comment ✅.
- **Scope**: 2-3 tuần (3 entity + workflow + UI dashboards).

## Documents/contracts upload {#docs}

`libs/storage` đã có (GCS/local provider). Wire UI cho HR upload PDF hợp đồng, đính kèm Employee profile.

- **Trigger**: HR cần lưu bản scan giấy tờ.
- **Dep**: F2 employee ✅, libs/storage ✅.
- **Scope**: 2-3 ngày (Employee.documents[], upload modal, secure download URL).

## Mobile app {#mobile}

React Native. Share types qua `packages/shared/`. MVP scope: timesheet check-in, request create/approve, calendar view.

- **Trigger**: business commit, không có half-measure (responsive web vs native).
- **Dep**: cần `packages/` workspace setup.
- **Scope**: 6-8 tuần (toàn flow auth + sidebar + 5 view chính).

## WORK app {#work-app}

Bounded context mới `apps/backend/src/apps/work/`. Task, Project, Deadline, Sprint. Tách khỏi F7.5 Tasks (task gắn calendar) — đây là project management toàn diện.

- **Trigger**: SaaS C-HR muốn mở rộng beyond HR sang PM.
- **Dep**: F7.5 tasks ✅ làm trước, sau extract sang WORK app.
- **Scope**: 1-2 tháng (full bounded context).

## Payroll {#payroll}

Module riêng `apps/backend/src/apps/payroll/`. Sensitive — cần audit + permission strict.

- **Trigger**: business confirm chính thức (đã defer trong roadmap hiện tại).
- **Dep**: F2 employee ✅, attendance ✅, leave-balance ([f5-leave-balance.md](f5-leave-balance.md)) done.
- **Scope**: 1 tháng (entity Payslip/Tax/Deduction, calc engine, payslip PDF, period close).

## Multi-currency cho Org {#multi-currency}

Hiện `Organization.currency` mặc định `VND`. Mở rộng: per-Org currency + Payroll/Expense convert.

- **Trigger**: Payroll commit hoặc khách hàng nước ngoài.
- **Dep**: Payroll module hoặc Expense module trước.
- **Scope**: 1-2 ngày + audit toàn bộ amount field.

## Multi-step approval workflow cho leave > N ngày {#multi-step}

Vd: leave > 5 ngày → direct manager approve trước → HR appadmin approve sau.

- **Trigger**: Org có policy này.
- **Dep**: F5 ✅ done.
- **Scope**: 1 tuần (Request lifecycle thêm `approvalSteps[]`, dispatch step-by-step).

## Out-of-office delegate cho approver {#delegate}

Khi approver đi vắng, ủy quyền cho người khác duyệt thay.

- **Trigger**: Org > 50 người, manager nghỉ dài.
- **Dep**: F5 ✅ done.
- **Scope**: 2-3 ngày (entity `ApproverDelegation`, getApproverCandidates resolve through delegation).

## Time-off accrual chi tiết hơn {#accrual-detail}

Mở rộng [f5-leave-balance.md](f5-leave-balance.md) MVP: multi-tier policy (junior/senior/manager khác quota), tenure-based bonus (làm 5 năm +2 ngày/năm), use-it-or-lose-it.

- **Trigger**: Org có HR policy phức tạp.
- **Dep**: F5 leave-balance MVP ✅.
- **Scope**: 3-5 ngày.

---

## Quy trình promote 1 mục từ roadmap → plan riêng

1. User confirm scope + timeline.
2. Tạo `docs/plans/<feature>.md` từ template (Schema → BE → FE → Smoke → Done-when → Defers).
3. Update [features.md](features.md) "Gap còn lại" reference plan file.
4. Update bảng status [features.md §Trạng thái hiện tại](features.md#trạng-thái-hiện-tại-cập-nhật-2026-05-10) khi feature ship.
5. `pnpm docs:index` để MCP server pick up.
