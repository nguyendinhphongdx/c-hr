---
title: C-HR domain model (backend)
description: HRM business entities, relationships, invariants. Source of truth cho Prisma schema và service logic.
tags: [project, domain, glossary, hrm, c-hr]
---

# C-HR domain model — backend

Outline cho HRM domain. Iterate qua từng feature theo [REFACTOR_PLAN.md](../../../../REFACTOR_PLAN.md) → [FEATURES_PLAN.md](../../../../FEATURES_PLAN.md). Mỗi quyết định lớn ghi ADR trong [decisions/](decisions/).

## DB convention (cứng)

- **Tên cột**: snake_case (`first_name`, `direct_manager_id`, `created_at`).
- **Tên bảng**: snake_case plural (`users`, `employees`, `audit_logs`).
- **Code (Prisma model + TypeScript)**: camelCase (`firstName`, `directManagerId`, `createdAt`).
- **Mapping**: dùng `@map("snake_case")` cho field, `@@map("table_name")` cho table.
- **Mọi bảng business** phải có `created_at` (default `now()`) + `updated_at` (auto on update).
- **PK**: UUID v4 (`@id @default(uuid())`).
- **Soft-delete** cho dữ liệu nhân sự nhạy cảm: `deleted_at DateTime?`.

Snippet mẫu:

```prisma
model SomeEntity {
  id              String    @id @default(uuid())
  organizationId  String    @map("organization_id")
  someField       String    @map("some_field")
  createdAt       DateTime  @default(now())     @map("created_at")
  updatedAt       DateTime  @updatedAt          @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  @@map("some_entities")
}
```

## Glossary

| Term | Meaning |
| --- | --- |
| Organization (Org) | Doanh nghiệp khách hàng. Mọi data HR thuộc 1 Org (multi-tenant). |
| App | Bounded context nghiệp vụ: HRM, Attendance, Work, … 1 Org có thể bật nhiều app. Mỗi app có code (`HRM`, …) khớp folder `src/apps/<context>/`. |
| User | Tài khoản đăng nhập. `role`: `sysowner` (chủ vận hành SaaS), `admin` (admin Org tổng), `user` (nhân viên thường). |
| AppAdmin | User được gán quyền admin cho 1 app cụ thể trong 1 Org (vd HRM appadmin). Áp dụng cho user `role=user`. User `role=admin` đã tự bao quyền appadmin nên không cần record. |
| Role hierarchy | `sysowner ⊃ admin ⊃ appadmin (per-app) ⊃ user`. Quyền cao bao quyền thấp. |
| Employee | Hồ sơ nhân viên thuộc Org. Liên kết 1-1 (hoặc 1-0..1) với User qua `User.employeeId`. |
| Department | Phòng ban. Nested qua `parent_department_id`. Có manager (`manager_id → Employee`). |
| OrgChart | Cây tổ chức suy ra từ Department tree + manager_id. Single source of truth cho "ai là quản lý của ai" (xem [ADR 0004](decisions/0004-orgchart-source-of-truth.md)). |
| WorkSchedule | Cấu hình giờ làm chuẩn của Org (T2-T6, 8h-17h, late grace, …). |
| Timesheet | UI calendar tháng — view của AttendanceLog. Không phải entity. |
| AttendanceLog | Bản ghi chấm công, đa số đến từ device push (ZKTeco/Hikvision). |
| AttendanceCorrection | Đơn quên/sai chấm công, gửi duyệt manager để bổ sung log. |
| LeaveRequest | Đơn xin nghỉ phép (annual/sick/unpaid/…). |

## Entity outline

> Chỉ liệt kê các entity sẽ implement. Chi tiết schema viết trong feature tương ứng (xem FEATURES_PLAN.md).

### `User`
- Tài khoản đăng nhập.
- Fields: `id`, `email (unique)`, `password`, `name?`, `avatar?`, `title?` (user tự set, vd "Senior Engineer"), `role (sysowner | admin | user)`, `organizationId?` (null cho sysowner), `employeeId? (1-1 unique)`, timestamps.
- Role hierarchy: `sysowner ⊃ admin ⊃ appadmin ⊃ user`. Helper `isAdmin(user, orgId)` cho admin Org, `isAppAdmin(user, app, orgId)` cho appadmin (admin tự pass).

### `Organization`
- Multi-tenant root. Tất cả entity HR khác có `organization_id`.
- Fields: `id`, `name`, `slug (unique)`, `timezone (default "Asia/Ho_Chi_Minh")`, `currency (default "VND")`, timestamps, `deleted_at?`.

### `AppAdmin`
- Gán quyền admin per-app cho user `role=user` (user `role=admin` đã tự bao). Xem [ADR 0003](decisions/0003-no-permission-engine.md).
- Fields: `id`, `userId`, `organizationId`, `appCode (HRM | …)`, `grantedBy?`, `createdAt`.
- Constraint: composite unique `(userId, organizationId, appCode)`.
- Quy ước: chỉ user `role=admin` (hoặc sysowner) gán/xóa được record này.

### `Department`
- Phòng ban. Nested qua `parent_id`. Source of truth cho orgchart.
- Fields: `id`, `organizationId`, `parentId?`, `managerId? → Employee`, `name`, `code?`, timestamps, `deleted_at?`.
- Constraint: composite unique `(organizationId, code)` khi `code` non-null.

### `Employee`
- Hồ sơ nhân viên thuộc Org. **Chỉ giữ `departmentId`** (không có `directManagerId`, không có `positionId`).
- Fields: `id`, `organizationId`, `userId? (1-1 nullable, link sang User)`, `departmentId? `, `code (unique trong Org)`, `firstName`, `lastName`, `dob?`, `gender?`, `phone?`, `email`, `title?` (HR set, chức danh chính thức trong Org), `hireDate?`, `terminationDate?`, `status (ACTIVE | ON_LEAVE | TERMINATED)`, timestamps, `deleted_at?`.
- Constraint: composite unique `(organizationId, code)`.
- Note: `User.title` (cá nhân, user tự set) ≠ `Employee.title` (chính thức, HR set). Hiển thị 2 chỗ khác nhau.

### `WorkSchedule` + `WorkShift`
- Cấu hình giờ làm. 1 schedule có nhiều shift (theo ngày trong tuần) → cover được "T2-T6 + sáng T7" hoặc 3 ca xoay.
- **WorkSchedule** fields: `id`, `organizationId`, `name`, `isDefault Bool`, timestamps. Có 1-N `shifts`.
- **WorkShift** fields: `id`, `workScheduleId`, `name` (vd "Ca chính", "Sáng T7"), `startTime "08:00"`, `endTime "17:00"`, `daysOfWeek Int[]` (ISO: `[1=T2, 2=T3, ..., 7=CN]`), `breakMinutes`, `lateGraceMinutes (default 15)`, `crossesMidnight Bool` (cho ca đêm 22h-6h), timestamps.
- Org có 1 schedule mặc định (`isDefault = true`); employee follow schedule đó.
- Logic timesheet: với 1 ngày, pick shift có `daysOfWeek` chứa ISO dayOfWeek của ngày đó. MVP constraint: 1 ngày max 1 shift trong 1 schedule (multi-shift cùng ngày + employee→shift assignment defer).

### `AttendanceDevice`
- Thiết bị chấm công đăng ký vào Org.
- Fields: `id`, `organizationId`, `brand (ZKTECO | HIKVISION | SUPREMA | OTHER)`, `serialNumber`, `token (cho push auth)`, `name`, `ipAddress?`, `lastSeenAt?`, `isActive`, timestamps.
- Push endpoint: `POST /api/v1/attendance-devices/push` xác thực qua `token`.

### `AttendanceLog`
- Bản ghi chấm công. **User không tự tạo** — chỉ device push hoặc HR tạo qua AttendanceCorrection được duyệt.
- Fields: `id`, `organizationId`, `employeeId`, `date`, `checkInAt? (datetime)`, `checkOutAt? (datetime)`, `source (DEVICE | CORRECTION | MANUAL_HR)`, `deviceId?`, `deviceLogId?` (idempotency), `note?`, timestamps.
- Constraint: composite unique `(employeeId, date)` — 1 log/ngày, update thay create nếu push lần 2.
- Idempotency: `(deviceId, deviceLogId)` unique để device replay không tạo duplicate.

### `AttendanceCorrection`
- Đơn quên/sai chấm công. Gửi duyệt như LeaveRequest.
- Fields: `id`, `organizationId`, `requesterId → Employee`, `approverId? → Employee`, `date`, `requestedCheckIn?`, `requestedCheckOut?`, `reason`, `status (PENDING | APPROVED | REJECTED | CANCELLED)`, `approvedAt?`, timestamps.
- Approve thành công → tạo/update AttendanceLog với `source = CORRECTION`.

### `LeaveRequest`
- Đơn xin nghỉ phép.
- Fields: `id`, `organizationId`, `requesterId → Employee`, `approverId? → Employee`, `type (ANNUAL | SICK | UNPAID | MATERNITY | OTHER)`, `startDate`, `endDate`, `reason?`, `status (PENDING | APPROVED | REJECTED | CANCELLED)`, `approvedAt?`, timestamps.
- State machine: `PENDING → APPROVED | REJECTED | CANCELLED`. Không cho ngược.

### `AuditLog`
- Xem [ADR 0002](decisions/0002-audit-log.md). Schema chi tiết trong ADR.

## Relationships

```text
Organization 1 ── n User
Organization 1 ── n AppAdmin (User × AppCode)
Organization 1 ── n Employee  ── 0..1 User
Organization 1 ── n Department (parent? → Department, manager? → Employee)
Employee n ── 0..1 Department          (Employee.departmentId)
Department 0..1 ── 1 Employee (manager) (Department.managerId)
Organization 1 ── n WorkSchedule 1 ── n WorkShift
Organization 1 ── n AttendanceDevice 1 ── n AttendanceLog
Employee 1 ── n AttendanceLog
Employee 1 ── n AttendanceCorrection (── 0..1 Employee approver)
Employee 1 ── n LeaveRequest         (── 0..1 Employee approver)
```

## Invariants

Mỗi invariant phải map sang 1 check trong code (DB constraint, validation, service logic).

- **Tenant isolation**: mọi query feature phải filter `organizationId`. Repository pattern tay enforce ([ADR 0001](decisions/0001-tenant-isolation.md)).
- **User ↔ Employee 1-1**: `User.employeeId` unique khi non-null. `User.organizationId` phải khớp `Employee.organizationId`. Chỉ user có `role` ∈ `{admin, user}` mới có `employeeId` (sysowner không link Employee).
- **Employee bắt buộc thuộc Department**: `Employee.departmentId` NOT NULL ở tất cả Employee active (kể cả CEO thuộc dept "Ban giám đốc"). Để tránh `getNearestManager()` lỗi không tìm thấy chain.
- **Department không cycle**: validate trước khi đổi `parentId` — walk up tree, reject nếu gặp lại chính mình.
- **AttendanceLog**: composite unique `(employeeId, date)`. Idempotent qua `(deviceId, deviceLogId)`.
- **LeaveRequest / AttendanceCorrection**: `endDate >= startDate` (nếu range). State machine không cho ngược.
- **Soft-delete Employee**: chỉ ẩn (`deletedAt`), không hard-delete. Lý do: attendance/leave/audit history phải truy vết được.
- **AppAdmin**: composite unique `(userId, organizationId, appCode)`. Gán/xoá phải audit log.
- **Self-approve**: requester có thể chọn chính mình làm `approverId` (vd CEO khi không có nearest manager). KHÔNG auto-approve khi tạo — vẫn flow approve thường (mở đơn, click approve).

## Approver lookup logic

Khi tạo LeaveRequest/AttendanceCorrection:

1. BE expose `GET /api/v1/orgchart/approver-candidates?employeeId=X` → trả `{ suggested, candidates[] }`.
2. `suggested` = `getNearestManager(X)` (xem [ADR 0004](decisions/0004-orgchart-source-of-truth.md)). Nếu null → `suggested` = HRM appadmin đầu tiên.
3. `candidates` = manager chain ∪ HRM appadmins (dedupe, exclude requester nếu muốn — nhưng cho phép self).
4. FE hiển thị dropdown default `suggested`, user có thể đổi sang bất kỳ ai trong `candidates`.
5. BE validate khi submit: `dto.approverId ∈ candidates`.

## Open questions / TODOs

- [ ] Multi-currency cho Org (ban đầu chỉ VND).
- [ ] Approval workflow multi-step cho leave > N ngày (vd direct manager → HR appadmin) — defer.
- [ ] Out-of-office delegate cho approver — defer.
- [ ] Audit log retention configurable per-Org — defer.
- [ ] Matrix org (N-N managers) — defer.
- [ ] Employee history (manager change, dept change, title change) — chỉ qua audit log MVP.
- [ ] AttendanceDevice pull mode (cron qua TCP socket) cho device cũ không push — defer.

## ADRs (`decisions/`)

- [0001 — Tenant isolation via manual repository pattern](decisions/0001-tenant-isolation.md)
- [0002 — Audit log via @Auditable interceptor](decisions/0002-audit-log.md)
- [0003 — No permission engine, code if/else + AppAdmin model](decisions/0003-no-permission-engine.md)
- [0004 — OrgChart source of truth: Department.managerId + parentDepartmentId](decisions/0004-orgchart-source-of-truth.md)
- [0005 — Backend folder structure: src/apps/<context>/<module>/](decisions/0005-folder-structure-bounded-contexts.md)
