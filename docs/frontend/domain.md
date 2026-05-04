---
title: C-HR domain model (frontend)
description: HRM user flows, route map, feature breakdown. Đối chiếu với backend domain.
tags: [project, domain, hrm, c-hr]
---

# C-HR domain model — frontend

> Outline cho UI/UX của C-HR. Source of truth domain (entities, invariants) ở [docs/domain.md](../domain.md). File này tập trung vào **user flow** và **route map** của FE.

## User personas

| Persona | Role / Permissions | Mục tiêu chính |
| --- | --- | --- |
| **Org Admin** | Toàn quyền trong Org | Quản lý nhân viên, phòng ban, lương |
| **HR Staff** | Tạo/sửa employee, duyệt leave, chạy payroll | Vận hành HR hằng ngày |
| **Manager** | Xem team mình, duyệt leave team | Theo dõi team, approve đơn |
| **Employee** | Xem hồ sơ mình, chấm công, xin nghỉ | Self-service |

(Permission cụ thể TBD — sẽ chốt khi vào module auth/RBAC.)

## Route map (dự kiến)

```text
/                           Landing page (public)
/login                      Auth (public, route group `(auth)`)
/register                   Auth — registration (nếu cho self-signup Org)
/forgot-password
/reset-password
/verify-email

/dashboard                  Home (protected, route group `(dashboard)`)
/employees                  List + filter + search
/employees/new
/employees/[id]             Profile (tabs: info, attendance, leave, payroll)
/departments                Tree view + CRUD
/positions                  CRUD đơn giản
/attendance                 Bảng chấm công (theo tháng, theo employee)
/attendance/me              Self-service: tự chấm
/leave                      Đơn nghỉ — list (filter theo team, status)
/leave/new
/leave/[id]                 Chi tiết + approve/reject (nếu là approver)
/payroll                    Kỳ lương — list
/payroll/[periodId]         Bảng lương 1 kỳ (sortable, exportable)
/payroll/[periodId]/[empId] Chi tiết payroll 1 nhân viên
/settings/account           Profile của user đang login
/settings/organization      (Admin) thông tin Org, timezone, currency
/settings/users             (Admin) quản lý users + roles
```

## Feature → folder map

Theo convention frontend (mỗi feature = 1 bounded slice trong `src/features/<name>/`):

| Feature | Folder | Routes phục vụ |
| --- | --- | --- |
| `auth` | đã có | `(auth)/*`, `me` query |
| `dashboard` | đã có | `/dashboard` |
| `settings` | đã có | `/settings/*` |
| `employees` | sẽ tạo | `/employees`, `/employees/[id]` |
| `departments` | sẽ tạo | `/departments` |
| `positions` | sẽ tạo | `/positions` |
| `attendance` | sẽ tạo | `/attendance`, `/attendance/me` |
| `leave` | sẽ tạo | `/leave/*` |
| `payroll` | sẽ tạo | `/payroll/*` |

Mỗi feature theo cấu trúc:

```text
features/<name>/
├── components/     UI riêng feature
├── hooks/          TanStack Query hooks (useFooQuery, useFooMutation)
├── services/       axios calls qua apiClient
├── types/          interface + zod schema
├── views/          *View.tsx — App Router page delegate vào đây
├── store.ts?       Zustand UI-only state (nếu cần)
└── index.ts        re-export public API
```

## Cross-feature concerns

- **Layout**: sidebar `<DashboardShell>` (đã có) — sẽ thêm nav items theo thứ tự feature implement.
- **Permission gating**: dùng `<AuthGuard>` (đã có) cho route group `(dashboard)`. Permission per-feature (vd: chỉ HR thấy menu Payroll) sẽ implement qua role check ở client + double-check ở BE.
- **Data fetching**: tất cả qua `apiClient` (axios) + TanStack Query. KHÔNG fetch trực tiếp trong RSC (BE đặt cookie httpOnly nên RSC không có session — hand-off qua client).
- **Form validation**: zod schema trong cùng file form, type infer qua `z.infer`.
- **i18n**: chưa scope. Khi vào, đặt locale string ở `src/lib/i18n/`.

## Invariants UI

- **Org context phải resolved trước khi render dashboard**: lấy từ `me` query, fail → redirect `/login`. Nhân viên không thấy Org khác.
- **Soft-delete employee không xuất hiện trong list mặc định**, nhưng vẫn hiện trong payroll history (BE return).
- **Form payroll**: số tiền hiển thị theo `Org.currency` (mặc định VND). Không format hard-code.
- **Date / timezone**: hiển thị theo `Org.timezone`, không browser timezone — tránh mismatch chấm công.

## Open questions

- [ ] Mobile-first hay desktop-first cho `/attendance/me` (chấm công trên điện thoại)?
- [ ] Có cần app PWA cho self-service không?
- [ ] Bảng employees có cần virtualization (>1000 rows)?
- [ ] Filter persistence qua URL searchParams hay localStorage?
