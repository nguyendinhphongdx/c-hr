---
title: C-HR domain model (backend)
description: HRM business entities, relationships, invariants. Source of truth cho Prisma schema và service logic.
tags: [project, domain, glossary, hrm, c-hr]
---

# C-HR domain model — backend

> Đây là **outline** cho HRM domain. Sẽ được iterate qua từng feature theo plan trong [REFACTOR_PLAN.md](../../../../REFACTOR_PLAN.md). Khi vào tính năng cụ thể, ADR (`decisions/`) ghi lại quyết định.

## Glossary

| Term | Meaning |
| --- | --- |
| Organization (Org) | Doanh nghiệp khách hàng. Mọi data dưới đây thuộc 1 Org (multi-tenant). |
| User | Tài khoản đăng nhập. Có thể không phải Employee (vd: admin platform). |
| Employee | Nhân viên thuộc Org. Liên kết 1-1 (hoặc 1-0..1) với User. |
| Department | Phòng/ban trong Org. Có thể nested. |
| Position | Chức danh / vị trí công việc. |
| Attendance | Bản ghi chấm công (check-in/out, giờ làm). |
| Leave | Đơn xin nghỉ phép (annual, sick, unpaid, …) cần approval. |
| Payroll Period | Kỳ tính lương (thường tháng). |
| Payroll Record | Bảng lương 1 nhân viên trong 1 kỳ. |

## Entity outline

> Lưu ý: schema Prisma hiện chỉ có `User` model. Các entity dưới đây sẽ được thêm tuần tự — đừng tạo hết một lượt.

### `Organization`
- Multi-tenant root. Tất cả entity HR khác có `organizationId`.
- Key fields: `id (uuid)`, `name`, `slug (unique)`, `timezone`, `currency`, `createdAt`, `updatedAt`.

### `User` (đã có)
- Tài khoản đăng nhập. Hiện có: `id`, `email (unique)`, `password`, `name`, `avatar`, `role (ADMIN|USER)`, `status (ACTIVE|SUSPENDED)`.
- Cần thêm sau (Phase HR): `organizationId` (nullable cho super-admin platform), `employeeId` (1-1 với Employee, nullable nếu user là admin platform).

### `Employee`
- Hồ sơ nhân viên thuộc Org. 1 user có thể là 1 employee (1-1).
- Key fields: `id`, `organizationId`, `userId? (1-1 nullable)`, `code (unique trong Org)`, `firstName`, `lastName`, `dob`, `gender`, `phone`, `email`, `hireDate`, `terminationDate?`, `departmentId?`, `positionId?`, `status (ACTIVE|ON_LEAVE|TERMINATED)`, `deletedAt? (soft-delete)`.

### `Department`
- Phòng ban. Hỗ trợ nested: `parentDepartmentId? → Department`.
- Key fields: `id`, `organizationId`, `name`, `code? (unique trong Org)`, `parentDepartmentId?`, `managerId? → Employee`, `createdAt`, `updatedAt`.

### `Position`
- Chức danh.
- Key fields: `id`, `organizationId`, `title`, `code? (unique trong Org)`, `level?`, `description?`.

### `AttendanceLog`
- Bản ghi chấm công.
- Key fields: `id`, `organizationId`, `employeeId`, `date`, `checkInAt? (datetime)`, `checkOutAt? (datetime)`, `source (MANUAL|DEVICE|API)`, `note?`.
- Constraint: 1 employee chỉ có tối đa 1 log / ngày (composite unique `employeeId + date`).

### `LeaveRequest`
- Đơn xin nghỉ phép.
- Key fields: `id`, `organizationId`, `employeeId`, `type (ANNUAL|SICK|UNPAID|MATERNITY|OTHER)`, `startDate`, `endDate`, `reason?`, `status (PENDING|APPROVED|REJECTED|CANCELLED)`, `approverId? → Employee`, `approvedAt?`, `createdAt`.

### `PayrollPeriod`
- Kỳ tính lương.
- Key fields: `id`, `organizationId`, `year`, `month`, `status (DRAFT|LOCKED|PAID)`, `lockedAt?`, `paidAt?`.
- Constraint: composite unique `organizationId + year + month`.

### `PayrollRecord`
- Bảng lương 1 nhân viên / kỳ.
- Key fields: `id`, `payrollPeriodId`, `employeeId`, `baseSalary`, `allowance`, `deduction`, `tax`, `netAmount`, `breakdown (jsonb)`.
- Constraint: composite unique `payrollPeriodId + employeeId`.

## Relationships (high-level)

```text
Organization 1 ── n User
Organization 1 ── n Employee  ── 0..1 User
Organization 1 ── n Department (parent? → Department, manager? → Employee)
Organization 1 ── n Position
Employee n ── 0..1 Department
Employee n ── 0..1 Position
Employee 1 ── n AttendanceLog
Employee 1 ── n LeaveRequest  ── 0..1 Employee (approver)
Organization 1 ── n PayrollPeriod 1 ── n PayrollRecord ── 1 Employee
```

## Invariants

Mỗi invariant phải map sang một check trong code (DB constraint, validation, transaction).

- **Tenant isolation**: mọi query feature phải filter `organizationId`. Vi phạm = leak dữ liệu giữa các Org. Implement qua middleware/guard, không trust caller.
- **User ↔ Employee 1-1 trong Org**: `Employee.userId` unique (khi non-null), và `User.organizationId` phải khớp `Employee.organizationId`.
- **AttendanceLog**: composite unique `(employeeId, date)`.
- **PayrollPeriod**: composite unique `(organizationId, year, month)`.
- **LeaveRequest**: `endDate >= startDate`. Trạng thái không thể từ `APPROVED` → `PENDING` (chỉ `PENDING → APPROVED|REJECTED|CANCELLED`).
- **Soft-delete Employee**: chỉ ẩn (`deletedAt`), không hard-delete. Lý do: payroll/attendance history phải truy vết được.

## Open questions / TODOs

- [ ] Multi-currency cho Org? (ban đầu chỉ VND đủ chưa)
- [ ] Approval workflow cho LeaveRequest có cần multi-step (manager → HR) hay 1-step?
- [ ] Attendance device integration (máy chấm công vân tay) — sau hay không scope?
- [ ] Role-based access: `ADMIN` Org, `MANAGER` (xem team), `EMPLOYEE` (xem mình) — mô hình permission cụ thể TBD.
- [ ] Audit log (ai sửa lương ai, khi nào) — cần thiết khi vào payroll.

Khi bắt tay vào 1 module, viết ADR ở `decisions/0xxx-<topic>.md` để chốt quyết định trước khi code.
