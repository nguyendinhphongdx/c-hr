---
title: C-HR features plan
description: Queue tính năng HRM theo bounded context. Bắt đầu sau khi refactor.md done.
tags: [project, plan, features, hrm, c-hr]
---

# C-HR features plan

Plan tính năng HRM, **sau** khi xong [refactor.md](refactor.md) (Phase 1+2+3 + Phase 4 docs/MCP unification — root scaffolding, identity, docs gộp ra root, infra Docker chạy, Prisma migrate `_init` áp dụng).

> Domain & quyết định gốc: [../domain.md](../domain.md) + [../decisions/](../decisions/) (5 ADR).

## Nguyên tắc (cứng — không đổi)

1. **DB convention**: cột snake_case, bảng snake_case plural, code Prisma + TS camelCase, mọi bảng business có `created_at` + `updated_at`, PK = UUID v4, soft-delete data nhân sự (`deleted_at` nullable). Mapping qua `@map` + `@@map`.
2. **Không có permission engine** ([ADR 0003](../decisions/0003-no-permission-engine.md)): không decorator, không bảng permission. Service tự `if/else` dùng 2 helper `isAdmin(user, orgId)` + `isAppAdmin(user, app, orgId)`. Hierarchy bao gồm: `sysowner ⊃ admin ⊃ appadmin ⊃ user` — admin Org tự pass mọi appadmin check.
3. **Tenant isolation qua repository thủ công** ([ADR 0001](../decisions/0001-tenant-isolation.md)): `*ByOrg(orgId, …)` cho tenant, `*Raw(…)` cho bypass.
4. **OrgChart source of truth = Department tree** ([ADR 0004](../decisions/0004-orgchart-source-of-truth.md)): `Department.parentDepartmentId` + `Department.managerId`. Employee chỉ có `departmentId`. Query qua Postgres CTE recursive.
5. **Folder structure** ([ADR 0005](../decisions/0005-folder-structure-bounded-contexts.md)): `src/apps/<bounded-context>/<module>/`.
6. **1 feature = 1 PR** (BE module + Prisma migration + FE feature + test). Không trộn.
7. **Audit log** ([ADR 0002](../decisions/0002-audit-log.md)) cho mọi action thay đổi org structure / appadmin / approve workflow.

## Trạng thái hiện tại (cập nhật 2026-05-04)

| # | Feature | Status | Ghi chú |
| --- | --- | --- | --- |
| 0 | Foundation | ✅ done | Folder migration, ESLint flat config, audit infra deferred → F1 |
| 1 | Auth + Org + AppAdmin | ✅ done | Signup Org / me / admin grant/revoke, audit log, isAdmin/isAppAdmin helpers |
| 2 | HRM core: Department + Employee + OrgChart | ✅ done | CRUD đủ, OrgChart CTE + approver candidates, EmployeePicker, dept manager auto-link, soft-delete, edit pages |
| 3 | Attendance | ✅ done | BE 4 modules + 3 FE features. Migration f3_user_personal_info applied. API smoke 7/7 verify items pass (curl). FE typecheck/lint sạch. UI render manual smoke pending khi user demo. |
| 4 | Requests (per-type) | ⛔ superseded | F4 đã build LeaveRequest + AttendanceCorrection riêng — refactor sang F5 universal engine vì cần mở rộng (out-of-office, OT, …). Tables drop trong migration `f5_universal_requests`. |
| 5 | Requests (universal engine) | ✅ done | RequestGroup + Request polymorphic, `data: Json` validated theo `group.fieldsSchema`. 3 group seed: `leave`, `checkin`, `checkout`. Side-effect registry dispatch theo group code (checkin/checkout upsert AttendanceLog, leave no-op MVP). FE: master-detail UI + DynamicForm render theo schema. ADR 0006. |

### F3 verify checklist (đã chạy 2026-05-04 qua curl, BE :8000 + DB Docker)

- [x] Tạo work-schedule với 2 shift (T2-T6 ca chính 8-17, T7 sáng 8-12) → 201, refetch đúng
- [x] PATCH với daysOfWeek trùng → HTTP 400 + message "Day 3 appears in both 'Ca A' and 'Ca B'"
- [x] Tạo device → 201, plaintext token field separate, hash trong DB
- [x] `POST /attendance-devices/push` 1 event → `accepted: 1`, log row xuất hiện đúng `(employee, date)`
- [x] Replay 1-event push → `accepted: 0, duplicates: 1`, row count vẫn = 1
- [x] `GET /timesheet?employeeId=&year=2026&month=5` → grid 31 ngày: weekday có shift Ca chính, T7 có Sáng T7, CN status WEEKEND, ngày có log status PRESENT/LATE/EARLY_LEAVE
- [x] PATCH `/attendance-logs/:id` (admin) → `source: 'MANUAL_HR'`, `note` updated. `audit_logs` có entry `ATTENDANCE_LOG_UPDATE` với `actor_user_id` đúng

### Edge findings (non-blocking, ghi chú để fix sau)

1. **Multi-event push idempotency**: bảng `attendance_logs` chỉ store 1 `event_log_id` per `(employee, date)` row. Khi push IN+OUT cùng 1 ngày trong 1 request, chỉ event đầu được track; replay event thứ 2 trả `accepted: 1` thay vì `duplicates: 1`. Không phá data (row không dup, range timestamps merge OK), nhưng counter lệch. Fix khi vào prod: tách bảng `attendance_events` riêng, aggregate sang `attendance_logs`.
2. **`audit_logs.entity_id` empty cho CREATE actions** (DEPARTMENT_CREATE, EMPLOYEE_CREATE, ATTENDANCE_DEVICE_CREATE, WORK_SCHEDULE_CREATE). UPDATE actions ghi đúng. Pre-existing — `AuditInterceptor` chưa capture entity id từ response sau khi handler trả về. Fix: extract id từ response body trong interceptor (sau ResponseTransform).
3. **Error envelope code label**: BadRequestException trả body có `error.code: "INTERNAL_SERVER_ERROR"` nhưng HTTP status 400 đúng. Issue ở exception filter mapping → label cần map theo HttpException type. Nhỏ, FE đã unwrap `success/data` envelope nên không thấy.
4. **Timezone**: timestamps lưu UTC, nhưng status logic so wall-clock với shift `startTime "08:00"` (local). Test push UTC `01:12Z` (Vietnam 08:12) bị parse thành 01:12 → status sai logic. Cần convert sang Org timezone trước khi compare. Defer cho proper i18n pass.

### Manual UI smoke (chờ demo qua browser)

- `/settings/work-schedule` — render form, add/remove shift, save thành công
- `/settings/attendance-devices` — tạo device, modal show plaintext token 1 lần
- `/timesheet` — calendar grid render đúng, today highlight, hover popover (admin time picker)
- `/settings/profile` — patch User dob/gender/phone OK
- `/employees/new` + `[id]/edit` — UserPicker hoạt động, name hiển thị từ User

## Thứ tự implement

| # | Feature | Bounded context | BE deliverables | FE deliverables | Blocked-by |
| --- | --- | --- | --- | --- | --- |
| 0 | **Foundation** | core, common | Migrate `src/modules/` → `src/apps/core/`, `BaseRepository`, `audit_logs` table + `@Auditable` interceptor, `isAdmin` + `isAppAdmin` helpers, fix lint FE | Fix 2 lỗi lint pre-existing, sidebar nav slot cho HRM/Attendance/Requests (disabled cho đến khi feature implement) | — |
| 1 | **Auth + Org + User + AppAdmin** | core, platform, hrm | `Organization`, mở rộng `User` (`role`, `title`, `organizationId`, `employeeId`), `AppAdmin` model + module gán/xoá (admin Org gán cho user role=user), signup flow Org | Trang đăng ký Org (tạo Org + admin user), trang `/settings/organization`, trang `/settings/app-admins` (admin Org grant/revoke), profile edit (set `User.title`) | 0 |
| 2 | **HRM core: Department + Employee + OrgChart** | hrm | `Department` (nested + manager), `Employee` (departmentId, title, soft-delete, link User↔Employee), `OrgChartService` (CTE chain query, `getApproverCandidates`), `/orgchart` endpoints | `features/employees/` (list, search, profile), `features/departments/` (CRUD + tree picker), `features/orgchart/` 2 view React Flow (reporting line + department structure) | 1 |
| 3 | **Attendance: WorkSchedule + Device + Log + Timesheet UI** | attendance | `WorkSchedule` config, `AttendanceDevice` registry + push endpoint, `AttendanceLog` (composite unique `employee_id, date`, idempotent qua `event_log_id`), `Timesheet` query API trả về log theo tháng. **MVP simplified:** generic JSON push contract, no brand adapter. | `/settings/work-schedule`, `/settings/attendance-devices`, `/timesheet` (calendar tháng — grid 7 cột, mỗi ô check-in/out + status badge). `/timesheet/team` deferred. | 2 |
| 4 | ⛔ **Requests per-type** (superseded by F5) | requests | Đã build `LeaveRequest` + `AttendanceCorrection` rời. Refactor sang universal engine F5 vì cần mở rộng linh hoạt cho các loại đơn khác (OT, OOO, …). Drop trong migration `f5_universal_requests`. | — | — |
| 5 | **Requests: Universal engine + form-builder defer** | requests | `RequestGroup` (system-wide, `fieldsSchema` JSON) + `Request` polymorphic. Validation engine self-built. Side-effect registry keyed by group code (checkin/checkout upsert AttendanceLog). 3 group seed: `leave`, `checkin`, `checkout`. ADR 0006. | `/requests` master-detail (list + preview pane). `DynamicForm` render từ `fieldsSchema`. `/requests/new` chọn group → form. Sidebar gộp 1 link "Requests". | 2, 3 |

Mỗi feature **kết thúc xanh khi**:

- BE: `pnpm --filter @c-hr/backend build` xanh, migration applied, swagger có endpoint mới, test integration cross-Org pass (vd tạo employee Org A, login Org B trả 403/404).
- FE: `pnpm --filter @c-hr/frontend check` xanh, route mới reachable, smoke test manual qua browser.
- Audit log entries tạo đúng cho action thay đổi.

## Feature 0 — Foundation

Dọn nền **không đụng schema**. Mọi việc cần model mới (BaseRepository tenant-scoped, isAdmin/isAppAdmin helpers, audit_logs) đẩy vào Feature 1 — vì chúng require Schema migration của Feature 1 (Organization, AppAdmin, Role enum mới) chạy trước.

### BE

- [x] **Migrate folder structure** (theo [ADR 0005](../decisions/0005-folder-structure-bounded-contexts.md)) — commit `0ce93d1`:
  - `git mv src/modules/{auth,user,health} → src/apps/core/{auth,user,health}`
  - `src/apps/core/core.module.ts` re-export Auth/User/Health.
  - `src/app.module.ts` import `CoreModule` thay 3 module.
  - `tsconfig.json` + jest `moduleNameMapper`: drop `@modules/*`, add `@apps/*`.
- [x] **BE eslint flat config** — commit `b85516c`:
  - `.eslintrc.cjs` → `eslint.config.mjs` (eslint 9 yêu cầu).
  - Dùng deps có sẵn (`@typescript-eslint/*`, `eslint-plugin-prettier`, `eslint-config-prettier`) — không thêm package mới.
  - Per-file override cho `src/libs/storage/providers/*.provider.ts` (allow `require()` cho optional deps lazy load).
  - Lint script `eslint . --fix`.

### FE

- [ ] Fix [`apps/frontend/src/features/auth/components/LoginForm.tsx`](apps/frontend/src/features/auth/components/LoginForm.tsx) — 2 errors `react-hooks/set-state-in-effect`.
- [ ] Fix [`apps/frontend/src/features/auth/components/RegisterForm.tsx`](apps/frontend/src/features/auth/components/RegisterForm.tsx) — error tương tự.
- [ ] Fix [`apps/frontend/src/features/auth/views/VerifyOtpView.tsx:47`](apps/frontend/src/features/auth/views/VerifyOtpView.tsx#L47) — bỏ `setShake/setCode` ra khỏi useEffect body.
- [ ] Fix [`apps/frontend/src/features/dashboard/views/HomeView.tsx:15`](apps/frontend/src/features/dashboard/views/HomeView.tsx#L15) — bỏ import `Button` không dùng.
- [ ] `pnpm --filter @c-hr/frontend check` xanh.
- [ ] `<DashboardShell>` sidebar — thêm slot nav cho HRM (Employees, Departments, OrgChart), Attendance (Timesheet, Devices, Schedules), Requests (Leave, Corrections), Settings (Organization, AppAdmins). Disabled link đến khi feature implement, enable qua flag.

### Done-when

- Folder migrate xong, BE build + lint xanh.
- FE check xanh.
- Sidebar có slot disabled cho mọi context sắp implement.

### Defer sang Feature 1 (cần schema)

- `BaseRepository<T>` generic — chờ entity tenant-scoped đầu tiên (Organization). Pattern thật chỉ rõ khi >=2 repo concrete tồn tại. Có thể bắt đầu concrete `OrganizationRepository` trong F1, extract base ở F2 khi `EmployeeRepository` cùng pattern.
- `isAdmin` + `isAppAdmin` helpers — depend `Role` enum mới (`sysowner|admin|user`), `User.organizationId`, table `app_admins`.
- `audit_logs` + `@Auditable` decorator + `AuditInterceptor` — depend `AuditLog` model + FK đến User mở rộng. Spec ở [ADR 0002](../decisions/0002-audit-log.md).
- Prisma naming-convention check script — nice-to-have, defer.

## Feature 1 — Auth + Organization + User + AppAdmin

Chuyển app từ "1 hệ thống User" → "Org multi-tenant với 3 role (`sysowner`, `admin`, `user`) + AppAdmin per-app cho user `role=user`".

> Bao gồm cả 3 task infrastructure defer từ Feature 0 (BaseRepository, access helpers, audit log) — tất cả depend vào schema mới của F1.

### BE

- [ ] Prisma:
  ```prisma
  enum Role     { sysowner admin user }
  enum AppCode  { HRM }                              // sau: WORK, TASKS, ...

  model Organization {
    id        String   @id @default(uuid())
    name      String
    slug      String   @unique
    timezone  String   @default("Asia/Ho_Chi_Minh")
    currency  String   @default("VND")
    createdAt DateTime @default(now())               @map("created_at")
    updatedAt DateTime @updatedAt                    @map("updated_at")
    deletedAt DateTime?                              @map("deleted_at")
    users     User[]
    @@map("organizations")
  }

  model User {
    id             String    @id @default(uuid())
    email          String    @unique
    password       String
    name           String?
    avatar         String?
    title          String?                                         // user tự set
    role           Role      @default(user)
    organizationId String?                                          @map("organization_id")
    employeeId     String?   @unique                                @map("employee_id")
    createdAt      DateTime  @default(now())                        @map("created_at")
    updatedAt      DateTime  @updatedAt                             @map("updated_at")
    organization   Organization? @relation(fields: [organizationId], references: [id])
    appAdmins      AppAdmin[]
    @@map("users")
  }

  // Cấp quyền appadmin per-app cho user role=user.
  // User role=admin/sysowner đã tự bao nên KHÔNG cần record ở đây.
  model AppAdmin {
    id             String   @id @default(uuid())
    userId         String                              @map("user_id")
    organizationId String                              @map("organization_id")
    appCode        AppCode                              @map("app_code")
    grantedBy      String?                              @map("granted_by")
    createdAt      DateTime @default(now())            @map("created_at")
    user           User @relation(fields: [userId], references: [id])
    @@unique([userId, organizationId, appCode])
    @@index([organizationId, appCode])
    @@map("app_admins")
  }
  ```
- [ ] Migration: drop `enum UserRole` cũ (ADMIN/USER) → seed mới: `ADMIN` boilerplate → `admin` (organization_id sẽ gán sau khi tạo Org seed); thêm 1 sysowner cho dev. Trường `organization_id` nullable trong migration step 1, NOT NULL cho user role=admin/user enforced ở app code.
- [ ] **`isAdmin` + `isAppAdmin` helpers** (defer từ F0) trong `src/common/auth/access.ts`. Spec ở [ADR 0003](../decisions/0003-no-permission-engine.md). Unit test riêng cho `isAppAdmin` (admin/sysowner pass tự động, user role=user query DB).
- [ ] **`audit_logs` infra** (defer từ F0): `AuditLog` model + migration, `@Auditable()` decorator + `AuditInterceptor`, write async qua `@nestjs/event-emitter`. Spec ở [ADR 0002](../decisions/0002-audit-log.md). Apply lên các endpoint AppAdmin grant/revoke ngay trong F1.
- [ ] **`OrganizationRepository` concrete** (kèm Org module). Khi viết `EmployeeRepository` ở F2, nếu pattern lặp → extract `BaseRepository<T>` generic. **Không** scaffold base trước.
- [ ] **Module `core/organization`**:
  - `POST /api/v1/organizations/signup` — public, tạo Org + user đầu tiên (role=admin) trong 1 transaction. Admin tự bao quyền appadmin → không cần tạo AppAdmin record.
  - `GET /api/v1/organizations/me` — Org của user đang login.
  - `PATCH /api/v1/organizations/me` — chỉ admin Org (`isAdmin(user, orgId)`).
- [ ] **Module `core/user`** (mở rộng):
  - `GET /api/v1/users/me` — trả `{ user, organization, appAdmins[] }`.
  - `PATCH /api/v1/users/me` — đổi `name`, `title`, `avatar`. Không đổi `role`/`organizationId`/`employeeId`.
  - `PATCH /api/v1/users/me/password`.
- [ ] **Module `hrm/app-admin`**:
  - `GET /api/v1/app-admins?app=HRM` — list user được gán quyền HRM appadmin (chỉ user role=user mới có record; admin/sysowner không hiển thị nhưng đương nhiên có quyền).
  - `POST /api/v1/app-admins` body `{ userId, appCode }` — gán cho user role=user. Chỉ admin Org gán được (`isAdmin(currentUser, orgId)`). `@Auditable`.
  - `DELETE /api/v1/app-admins/:id` — xóa. `@Auditable`.
- [ ] `JwtStrategy` payload mở rộng: `{ userId, role, organizationId, employeeId }`. Set vào `RequestContextService`.
- [ ] Update seed: tạo 1 sysowner + 1 Org `acme-demo` + 1 user role=admin (founder) + 1 user role=user (employee thường).

### FE

- [ ] `features/auth`:
  - `/register` đổi thành "Đăng ký doanh nghiệp": fields `organizationName`, `slug` (auto-suggest từ name), `adminEmail`, `password`, `adminName`. Submit gọi `/organizations/signup`. Sau OK auto-login + redirect `/dashboard`.
  - `/login` không đổi.
- [ ] `me` query (TanStack Query) trả `{ user, organization, appAdmins }`. Cache trong `Providers`.
- [ ] `useIsAdmin()` + `useIsAppAdmin(app: AppCode)` hook — check theo hierarchy (admin Org tự pass appadmin):
  ```typescript
  const useIsAdmin = () => {
    const { data } = useMe();
    if (data?.user.role === 'sysowner') return true;
    return data?.user.role === 'admin';
  };

  const useIsAppAdmin = (app: AppCode) => {
    const isAdmin = useIsAdmin();
    const { data } = useMe();
    if (isAdmin) return true;
    return data?.appAdmins.some(a => a.appCode === app) ?? false;
  };
  ```
- [ ] `<DashboardShell>`:
  - Header hiển thị `organization.name` + `user.name` + `user.title` (nếu có) + dropdown logout.
  - Sidebar: nav HRM/Settings ẩn cho user role=user không phải HRM appadmin (read-only nav nếu cần).
- [ ] `features/settings/`:
  - `/settings/account` — edit `User.title`, `name`, `avatar`, đổi password.
  - `/settings/organization` — edit Org `name`, `timezone`, `currency`. Chỉ admin Org thấy (`useIsAdmin()`).
  - `/settings/app-admins` — table list + button "Add appadmin" (modal autocomplete user role=user), button remove. Chỉ admin Org thấy.

### Done-when

- 2 Org độc lập tạo qua UI; login chéo trả 403.
- sysowner seed thấy được mọi Org qua tool internal (chưa cần UI).
- Admin Org A grant HRM appadmin cho user role=user trong Org A; không grant được cho user Org B.
- User role=user có AppAdmin record cho HRM tạo được Employee. User role=admin tạo được Employee không cần AppAdmin record.
- Audit log entries cho `APP_ADMIN_GRANT`, `APP_ADMIN_REVOKE`, `ORGANIZATION_UPDATE`.

## Feature 2 — HRM core: Department + Employee + OrgChart

Trung tâm HR — entity các feature sau (Attendance, Requests) đều liên kết.

### BE

- [ ] Prisma:
  ```prisma
  model Department {
    id              String   @id @default(uuid())
    organizationId  String   @map("organization_id")
    parentId        String?  @map("parent_id")
    managerId       String?  @map("manager_id")
    name            String
    code            String?
    createdAt       DateTime @default(now())  @map("created_at")
    updatedAt       DateTime @updatedAt       @map("updated_at")
    deletedAt       DateTime?                 @map("deleted_at")
    parent          Department?  @relation("DeptTree", fields: [parentId], references: [id])
    children        Department[] @relation("DeptTree")
    manager         Employee?    @relation("DeptManager", fields: [managerId], references: [id])
    members         Employee[]
    @@unique([organizationId, code])
    @@index([organizationId, parentId])
    @@map("departments")
  }

  enum EmployeeStatus { ACTIVE ON_LEAVE TERMINATED }

  model Employee {
    id              String   @id @default(uuid())
    organizationId  String   @map("organization_id")
    userId          String?  @unique @map("user_id")
    departmentId    String?  @map("department_id")
    code            String                                     // HR set, unique per Org
    firstName       String   @map("first_name")
    lastName        String   @map("last_name")
    email           String
    phone           String?
    dob             DateTime? @map("date_of_birth")
    gender          String?
    title           String?                                    // HR set, chức danh chính thức
    hireDate        DateTime? @map("hire_date")
    terminationDate DateTime? @map("termination_date")
    status          EmployeeStatus @default(ACTIVE)
    createdAt       DateTime @default(now())  @map("created_at")
    updatedAt       DateTime @updatedAt        @map("updated_at")
    deletedAt       DateTime?                  @map("deleted_at")
    @@unique([organizationId, code])
    @@index([organizationId, departmentId])
    @@map("employees")
  }
  ```
- [ ] **Module `hrm/department`**:
  - CRUD `/api/v1/departments` (list nested tree, create, update, soft-delete) — gọi `isAppAdmin(user, 'HRM', orgId)`.
  - `setParent(id, parentId)` — validate cycle (walk up).
  - `setManager(id, employeeId)` — verify employee thuộc cùng Org.
  - Mọi action `@Auditable`.
- [ ] **Module `hrm/employee`**:
  - CRUD `/api/v1/employees` — chỉ HRM appadmin (admin Org tự pass) tạo/sửa/xóa.
  - List với pagination + filter (`departmentId`, `status`, search theo name/code/email).
  - `linkUser(employeeId, userId)` — gắn ORG_USER vào Employee (1-1). Validate: User thuộc cùng Org, User chưa link Employee khác.
  - Soft-delete: trigger event `employee.terminated` → reset `Department.managerId` nếu employee này đang là manager phòng nào (set null + audit).
  - Mọi mutate `@Auditable`.
- [ ] **Module `hrm/orgchart`**:
  - `OrgChartService` với raw SQL CTE (xem [ADR 0004](../decisions/0004-orgchart-source-of-truth.md)).
  - `GET /api/v1/orgchart` — toàn bộ cây Department + manager + employee count cho FE.
  - `GET /api/v1/orgchart/manager-chain?employeeId=X` — chuỗi quản lý.
  - `GET /api/v1/orgchart/approver-candidates?employeeId=X` — `{ suggested, candidates[] }`.
  - Cache Redis `orgchart:chain:${employeeId}` TTL 1h. Invalidate qua EventEmitter khi `Employee.departmentId`, `Department.managerId`, `Department.parentId` đổi.

### FE

- [ ] `features/employees/`:
  - `views/EmployeesListView.tsx` — TanStack Table (sortable, searchable, paginated).
  - `views/EmployeeDetailView.tsx` — tabs `Info | Attendance | Leave` (2 tab cuối placeholder).
  - `components/EmployeeForm.tsx` — react-hook-form + zod, dropdown Department (tree picker).
- [ ] `features/departments/`:
  - `views/DepartmentsTreeView.tsx` — nested tree, drag-drop reorder (optional, defer cũng OK).
  - `components/DepartmentForm.tsx` — name, code, parent, manager (autocomplete employee).
- [ ] `features/orgchart/`:
  - `views/OrgChartView.tsx` — React Flow.
  - 2 view tab switch:
    - **Reporting line**: vẽ theo manager chain (mỗi node = Employee, parent = manager phòng/cha — suy ra qua `OrgChartService.getOrgTree`).
    - **Department structure**: vẽ theo `Department.parentId`, mỗi node = Department + manager portrait + employee count.
- [ ] Sidebar enable Employees, Departments, OrgChart.
- [ ] Lib: `@xyflow/react` (React Flow v12 — match reference `ai-agent-builder`).

### Done-when

- HRM appadmin tạo dept tree 3 cấp + 10 employees + assign manager. OrgChart hiển thị đúng.
- Cross-Org isolation verified.
- Employee terminate → Department manager auto reset null + audit.
- `getApproverCandidates` trả `{ suggested, candidates[] }` đúng cho cả CEO (chain rỗng) và employee bình thường.

## Feature 3 — Attendance: WorkSchedule + Device + Log + Timesheet UI

User KHÔNG tự tạo log. Chỉ device push hoặc HR tạo qua AttendanceCorrection được duyệt (Feature 4).

### BE

- [ ] Prisma:
  ```prisma
  // Schedule + shift split — cover được "T2-T6 + sáng T7" hoặc 3 ca xoay
  model WorkSchedule {
    id              String      @id @default(uuid())
    organizationId  String      @map("organization_id")
    name            String                                   // "Lịch chuẩn 5.5 ngày", "Ca xoay"
    isDefault       Boolean     @default(false) @map("is_default")
    createdAt       DateTime    @default(now()) @map("created_at")
    updatedAt       DateTime    @updatedAt       @map("updated_at")
    shifts          WorkShift[]
    @@index([organizationId, isDefault])
    @@map("work_schedules")
  }

  model WorkShift {
    id                String   @id @default(uuid())
    workScheduleId    String   @map("work_schedule_id")
    name              String                                   // "Ca chính", "Sáng T7", "Ca đêm"
    startTime         String   @map("start_time")              // "08:00"
    endTime           String   @map("end_time")                // "17:00" hoặc "06:00" qua đêm
    daysOfWeek        Int[]    @map("days_of_week")            // ISO: [1=T2 ... 7=CN]
    breakMinutes      Int      @default(0) @map("break_minutes")
    lateGraceMinutes  Int      @default(15) @map("late_grace_minutes")
    crossesMidnight   Boolean  @default(false) @map("crosses_midnight")
    createdAt         DateTime @default(now()) @map("created_at")
    updatedAt         DateTime @updatedAt       @map("updated_at")
    workSchedule      WorkSchedule @relation(fields: [workScheduleId], references: [id], onDelete: Cascade)
    @@map("work_shifts")
  }

  enum DeviceBrand { ZKTECO HIKVISION SUPREMA OTHER }

  model AttendanceDevice {
    id              String      @id @default(uuid())
    organizationId  String      @map("organization_id")
    brand           DeviceBrand                                  // required, no default — admin must pick on create
    serial          String
    token           String                                       // bcrypt hash; plaintext shown once on regenerate
    name            String
    ipAddress       String?     @map("ip_address")
    lastSeenAt      DateTime?   @map("last_seen_at")
    isActive        Boolean     @default(true) @map("is_active")
    createdAt       DateTime    @default(now()) @map("created_at")
    updatedAt       DateTime    @updatedAt       @map("updated_at")
    @@unique([organizationId, serial])
    @@map("attendance_devices")
  }

  enum AttendanceSource { DEVICE CORRECTION MANUAL_HR }

  model AttendanceLog {
    id              String   @id @default(uuid())
    organizationId  String   @map("organization_id")
    employeeId      String   @map("employee_id")
    date            DateTime @db.Date
    checkInAt       DateTime? @map("check_in_at")
    checkOutAt      DateTime? @map("check_out_at")
    source          AttendanceSource
    deviceId        String?  @map("device_id")
    eventLogId      String?  @map("event_log_id")             // idempotency key from device
    note            String?
    createdAt       DateTime @default(now()) @map("created_at")
    updatedAt       DateTime @updatedAt       @map("updated_at")
    @@unique([employeeId, date])
    @@unique([deviceId, eventLogId])
    @@index([organizationId, date])
    @@map("attendance_logs")
  }
  ```
- [ ] **Module `attendance/work-schedule`**:
  - CRUD `/api/v1/work-schedules` + nested CRUD `/api/v1/work-schedules/:id/shifts`. Chỉ HRM appadmin.
  - 1 Org có 1 schedule `isDefault = true`.
  - Validate khi save: trong cùng schedule, các shift không được trùng `daysOfWeek` (MVP constraint 1 ngày 1 shift).
- [ ] **Module `attendance/attendance-device`**:
  - CRUD `/api/v1/attendance-devices`.
  - `regenerateToken(:id)` — tạo token mới, return plaintext 1 lần (lưu hash).
  - `POST /api/v1/attendance-devices/push` — public endpoint. Body generic JSON:

    ```json
    {
      "serial": "ZK-001",
      "token": "plaintext-from-create",
      "events": [
        { "eventLogId": "evt-99821", "employeeCode": "EMP-0001", "timestamp": "2026-05-04T08:12:00Z", "type": "IN" }
      ]
    }
    ```

    - Service upsert `AttendanceLog` theo `(employeeId, date)`: nếu chưa có → create; nếu có → update `checkInAt = MIN(existing, new)`, `checkOutAt = MAX(existing, new)`.
    - Idempotent qua `(deviceId, eventLogId)` unique — replay không tạo dup.
    - Update `device.lastSeenAt`.
  - **Defer**: brand-specific adapter (`ZKTecoAdapter`, `HikvisionAdapter`, ...) — chỉ thêm khi tích hợp real device. MVP dùng 1 generic contract trên cho mọi `brand`.
- [ ] **Module `attendance/attendance-log`**:
  - `GET /api/v1/attendance-logs?employeeId=&from=&to=` — list. Permission: EMPLOYEE chỉ xem mình; HRM appadmin xem mọi người.
  - `PATCH /api/v1/attendance-logs/:id` — chỉ HRM appadmin (manual fix). `@Auditable`.
- [ ] **Module `attendance/timesheet`**:
  - `GET /api/v1/timesheet?employeeId=&year=&month=` — return:
    ```json
    {
      "year": 2026, "month": 5,
      "workSchedule": {
        "name": "Lịch chuẩn 5.5 ngày",
        "shifts": [
          { "name": "Ca chính", "daysOfWeek": [1,2,3,4,5], "startTime": "08:00", "endTime": "17:00", "lateGraceMinutes": 15 },
          { "name": "Sáng T7",  "daysOfWeek": [6],         "startTime": "08:00", "endTime": "12:00", "lateGraceMinutes": 15 }
        ]
      },
      "days": [
        { "date": "2026-05-01", "shift": null, "checkInAt": null, "checkOutAt": null, "status": "WEEKEND" },
        { "date": "2026-05-04", "shift": "Ca chính", "checkInAt": "08:12", "checkOutAt": "17:30", "status": "LATE" },
        ...
      ]
    }
    ```
  - Logic pick shift cho 1 ngày: `schedule.shifts.find(s => s.daysOfWeek.includes(isoDayOfWeek(date)))`. Nếu không có shift → ngày nghỉ (`WEEKEND`).
  - `status` derive từ compare log + shift (`PRESENT | LATE | EARLY_LEAVE | ABSENT | WEEKEND`).
- **Defer (MVP skip)**: brand-specific adapter pattern (`AttendanceDeviceAdapter` interface + ZKTeco / Hikvision / Suprema implementations với `node-zklib`, ISAPI, BioStar). Chỉ scaffold khi có real device để integrate.

### FE

- [ ] `features/work-schedule/` — `/settings/work-schedule`. UI cho phép thêm/sửa/xóa shift trong schedule (form mỗi shift: name, daysOfWeek checkbox 7 ngày, start/end time, break, late grace, crosses midnight). Chỉ HRM appadmin.
- [ ] `features/attendance-devices/` — `/settings/attendance-devices`. Table list + form add device + button "Generate token" (modal show 1 lần). Chỉ HRM appadmin.
- [ ] `features/timesheet/`:
  - `/timesheet` — calendar tháng theo ảnh user gửi:
    - Grid 7 cột (T2 → CN), tự fit 4-6 tuần tháng.
    - Mỗi ô: header `d/M`, 2 dòng `→| --:--` (in) + `|→ --:--` (out) + clock icon mở time picker.
    - Today highlight (dark blue box số ngày).
    - Workday cells (ngày có shift match) tô background hồng; weekend (không có shift) trắng.
    - Late: highlight giờ in màu vàng. Absent (workday no log): icon warning.
    - Hover ô → tint nhẹ; click clock → Popover time picker (chỉ HRM appadmin edit; EMPLOYEE thường readonly + suggest "Tạo đơn quên chấm" → sang feature 4).
  - Tự build grid với `date-fns` + Tailwind. Time picker custom (Popover + 2 select hour/minute).
  - **Defer (MVP skip)**: `/timesheet/team` view cho HRM/manager — gộp vào sau khi feature 1 ổn.
- [ ] Sidebar enable Timesheet (cho mọi user — xem mình), Settings → Work Schedule + Devices (chỉ HRM appadmin).

### Done-when

- Cấu hình schedule "T2-T6 + sáng T7" với 2 shift, employee follow → timesheet hiển thị đúng workday + weekend.
- Đăng ký 1 device + generate token.
- Smoke test push: gửi POST với token → log xuất hiện trong timesheet.
- Timesheet hiển thị đúng status theo shift của ngày (PRESENT/LATE/ABSENT/WEEKEND).
- Composite unique enforced (push 2 lần cùng day → update, không create).
- User role=user chỉ xem mình; HRM appadmin xem team.

## Feature 5 — Universal Request engine

Replaces the original F4 (LeaveRequest + AttendanceCorrection per-type tables) with a polymorphic `Request` table + `RequestGroup` schema. See [ADR 0006](../decisions/0006-universal-request-engine.md).

### BE

- [x] Schema: drop `LeaveRequest` + `AttendanceCorrection`; add `RequestGroup` (system-wide) + `Request` (per-Org). Migration `f5_universal_requests`.
- [x] `groups.config.ts` — hard-coded definitions for `leave`, `checkin`, `checkout` with their `fieldsSchema`. Seed upserts on each `prisma:seed` run.
- [x] `request.validator.ts` — self-built validator: required, text/textarea maxLength, number min/max, date YYYY-MM-DD, time HH:MM, enum options.
- [x] `side-effects/registry.ts` — handlers keyed by group code. `checkin` upserts `attendance_logs.check_in_at`, `checkout` upserts `check_out_at`. Both run inside the approve transaction so a thrown handler rolls back the status update.
- [x] Module `requests/request` — CRUD + approve/reject/cancel + `@Auditable`. List supports `scope=mine|incoming` + `groupId` + `status` filters; HRM appadmin sees all in Org.
- [x] Module `requests/request-group` — read-only list/get for the schema dropdown.
- [x] `RequestsModule` barrel + wired into `AppModule`.

### FE

- [x] `features/requests/` — types/services/hooks, `DynamicForm` (renders `Input/Select/Textarea` per field type), `DynamicDataView` (read-only render), `StatusBadge`, `RequestPreview` (right panel with approve/reject/cancel actions).
- [x] `RequestListView` — master-detail layout (left: filtered list with group + scope filters, right: preview pane with decision actions). 2-column grid (resizable handle deferred — type mismatch with installed `react-resizable-panels`).
- [x] `RequestCreateView` — group select → DynamicForm → approver select. Pre-fills `?group=&date=` from query so timesheet "Tạo đơn quên chấm" can deep-link.
- [x] App routes `/requests`, `/requests/new`. Sidebar gộp 1 link "Requests" (was 2 — Leave + Corrections).

### Smoke E2E (curl, 2026-05-04)

- [x] List request-groups → 3 seeded groups returned with full schema
- [x] Create leave with full data → 201
- [x] Create leave missing required field → 400 "Trường 'Đến ngày' là bắt buộc"
- [x] Create leave with bad enum → 400 "'Loại nghỉ' phải là một trong: ANNUAL, SICK, ..."
- [x] Create checkin → approve → AttendanceLog row upserted with `source=CORRECTION` + `check_in_at` from `data.requestedCheckInAt` + `note` from `data.reason`
- [x] audit_logs entries: `REQUEST_CREATE`, `REQUEST_APPROVE`

### Defers (F5.2 / future)

- **Form-builder UI** for admin Org to add/edit RequestGroup `fieldsSchema` through a drag-drop interface. MVP: seed cứng + change-via-release.
- **Resizable panel** (drag-to-resize) — current 2-column grid is static at md breakpoint.
- **Sidebar pending-count badge** — endpoint `request.repository.countPendingByApprover` exists; FE polling to drive badge is the remaining bit.
- **Email notifications** — events emitted (`request.<group>.created/approved/rejected/cancelled`) but no MailService listener yet.
- **`leave` side-effect** — deduct leave-balance when leave-balance entity is added (later feature).

## Feature 4 — Requests: LeaveRequest + AttendanceCorrection (superseded)

Đơn từ — workflow approval qua orgchart.

### BE

- [ ] Prisma:
  ```prisma
  enum LeaveType    { ANNUAL SICK UNPAID MATERNITY OTHER }
  enum RequestStatus { PENDING APPROVED REJECTED CANCELLED }

  model LeaveRequest {
    id              String        @id @default(uuid())
    organizationId  String        @map("organization_id")
    requesterId     String        @map("requester_id")     // → Employee
    approverId      String?       @map("approver_id")      // → Employee
    type            LeaveType
    startDate       DateTime      @map("start_date") @db.Date
    endDate         DateTime      @map("end_date")   @db.Date
    reason          String?
    status          RequestStatus @default(PENDING)
    decisionNote    String?       @map("decision_note")
    decidedAt       DateTime?     @map("decided_at")
    createdAt       DateTime      @default(now()) @map("created_at")
    updatedAt       DateTime      @updatedAt       @map("updated_at")
    @@index([organizationId, requesterId])
    @@index([organizationId, approverId, status])
    @@map("leave_requests")
  }

  model AttendanceCorrection {
    id                  String        @id @default(uuid())
    organizationId      String        @map("organization_id")
    requesterId         String        @map("requester_id")
    approverId          String?       @map("approver_id")
    date                DateTime      @db.Date
    requestedCheckInAt  DateTime?     @map("requested_check_in_at")
    requestedCheckOutAt DateTime?     @map("requested_check_out_at")
    reason              String
    status              RequestStatus @default(PENDING)
    decisionNote        String?       @map("decision_note")
    decidedAt           DateTime?     @map("decided_at")
    createdAt           DateTime      @default(now()) @map("created_at")
    updatedAt           DateTime      @updatedAt       @map("updated_at")
    @@index([organizationId, requesterId])
    @@index([organizationId, approverId, status])
    @@map("attendance_corrections")
  }
  ```
- [ ] **Module `requests/leave-request`**:
  - `POST /api/v1/leave-requests` — body có `approverId` (FE chọn từ candidates), validate `approverId ∈ getApproverCandidates(requesterId)`. State `PENDING`.
  - `GET /api/v1/leave-requests` — filter `status`, `from`, `to`, `requesterId`. Permission:
    - EMPLOYEE: chỉ thấy đơn mình tạo + đơn mình là approver.
    - HRM appadmin: thấy tất cả Org.
  - `POST /api/v1/leave-requests/:id/approve` — chỉ approver. State `PENDING → APPROVED`. `@Auditable`.
  - `POST /api/v1/leave-requests/:id/reject` — chỉ approver. State `PENDING → REJECTED` + `decisionNote` bắt buộc. `@Auditable`.
  - `POST /api/v1/leave-requests/:id/cancel` — chỉ requester, chỉ khi `PENDING`.
  - Email async qua `MailService` khi approve/reject (template trong `libs/mail/templates/`).
- [ ] **Module `requests/attendance-correction`**:
  - Tương tự leave-request.
  - Khi approve → tạo/update `AttendanceLog` source `CORRECTION` qua transaction. `@Auditable`.

### FE

- [ ] `features/leave/`:
  - `/leave` — list filtered theo role (default tab "Đơn của tôi"; tab "Đơn cần duyệt" cho ai có pending).
  - `/leave/new` — form: type, date range, reason, **approver dropdown** (gọi `/orgchart/approver-candidates` trả `{suggested, candidates}`, default chọn `suggested`).
  - `/leave/[id]` — detail + approve/reject button (chỉ approver).
- [ ] `features/attendance-correction/`:
  - `/attendance-correction/new` — form: date, requested check-in/out, reason, approver dropdown.
  - `/attendance-correction` + `/attendance-correction/[id]` tương tự leave.
  - Trên `/timesheet` ngày EMPLOYEE quên chấm → button "Tạo đơn quên chấm" pre-fill date.
- [ ] Sidebar badge số đơn `PENDING` mà user là approver.

### Done-when

- Employee A tạo đơn nghỉ → suggested = nearest manager → A submit → manager B nhận trong "Đơn cần duyệt" → approve → email gửi đi → trạng thái cập nhật.
- CEO (chain rỗng) tạo đơn → candidates = HRM appadmins → CEO chọn chính mình → đơn xuất hiện trong "Đơn cần duyệt" của CEO → CEO approve thường → audit log ghi cả requester=approver=cùng người.
- Employee tạo đơn quên chấm → manager approve → AttendanceLog xuất hiện trong timesheet với source `CORRECTION`.

## Sau Feature 4 (roadmap dài hơi)

Optional, không scope MVP:

- **ZK-Bridge** (`services/zk-bridge/`) — pull-side adapter cho ZKTeco / Hikvision / Suprema. Sống trong monorepo nhưng **deploy tách rời** ở LAN văn phòng khách hàng (poll device qua TCP/SDK → push sang `/attendance-devices/push` trên cloud). Spec đầy đủ: [zk-bridge.md](zk-bridge.md). Trigger: F1–F5 đóng + có khách hàng thật cần tích hợp device thật.
- **Audit log viewer UI** cho HRM appadmin xem theo entity / actor / time range.
- **Notifications real-time** (Redis Pub/Sub + WebSocket) thay cho email.
- **Time-off accrual** (cộng dồn phép theo tháng).
- **Performance reviews** module (mới — cần entity Review, Goal, Feedback).
- **Documents/contracts upload** (đã có `libs/storage`).
- **Mobile app** (React Native) — share types với FE qua `packages/`.
- **Payroll** (sau khi business confirm — đã defer ở quyết định hiện tại).
- **WORK app** (`src/apps/work/`) — quản lý công việc, task, deadline.

## Workflow mỗi feature (template)

1. Đọc lại ADR liên quan + section domain.md tương ứng.
2. Cập nhật Prisma schema (tuân thủ DB convention) → `pnpm --filter @c-hr/backend exec prisma migrate dev --name <feature>`.
3. BE: tạo module trong `src/apps/<context>/<module>/` (controller, service, repository extends `BaseRepository`, dto). Subagent `module-scaffolder` hỗ trợ.
4. FE: tạo feature trong `src/features/<feature>/`. Subagent `page-scaffolder` hỗ trợ.
5. Implement business logic (tự `if/else` permission, không decorator).
6. `pnpm --filter @c-hr/backend build` + `pnpm --filter @c-hr/frontend check` xanh trước commit.
7. Smoke test manual qua UI (cross-Org isolation cho mọi feature).
8. Commit + (sau này) PR.
