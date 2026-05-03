# C-HR features plan

Plan tính năng HRM, **sau** khi xong [REFACTOR_PLAN.md](REFACTOR_PLAN.md) (đã hoàn tất Phase 1+2+3 — root scaffolding, identity, smoke tests xanh, infra Docker chạy, Prisma migrate `_init` áp dụng).

> Domain & quyết định gốc: [apps/backend/docs/project/domain.md](apps/backend/docs/project/domain.md) + [apps/backend/docs/project/decisions/](apps/backend/docs/project/decisions/) (5 ADR).

## Nguyên tắc (cứng — không đổi)

1. **DB convention**: cột snake_case, bảng snake_case plural, code Prisma + TS camelCase, mọi bảng business có `created_at` + `updated_at`, PK = UUID v4, soft-delete data nhân sự (`deleted_at` nullable). Mapping qua `@map` + `@@map`.
2. **Không có permission engine** ([ADR 0003](apps/backend/docs/project/decisions/0003-no-permission-engine.md)): không decorator, không bảng permission. Service tự `if/else` dùng 2 helper `isAdmin(user, orgId)` + `isAppAdmin(user, app, orgId)`. Hierarchy bao gồm: `sysowner ⊃ admin ⊃ appadmin ⊃ user` — admin Org tự pass mọi appadmin check.
3. **Tenant isolation qua repository thủ công** ([ADR 0001](apps/backend/docs/project/decisions/0001-tenant-isolation.md)): `*ByOrg(orgId, …)` cho tenant, `*Raw(…)` cho bypass.
4. **OrgChart source of truth = Department tree** ([ADR 0004](apps/backend/docs/project/decisions/0004-orgchart-source-of-truth.md)): `Department.parentDepartmentId` + `Department.managerId`. Employee chỉ có `departmentId`. Query qua Postgres CTE recursive.
5. **Folder structure** ([ADR 0005](apps/backend/docs/project/decisions/0005-folder-structure-bounded-contexts.md)): `src/apps/<bounded-context>/<module>/`.
6. **1 feature = 1 PR** (BE module + Prisma migration + FE feature + test). Không trộn.
7. **Audit log** ([ADR 0002](apps/backend/docs/project/decisions/0002-audit-log.md)) cho mọi action thay đổi org structure / appadmin / approve workflow.

## Thứ tự implement

| # | Feature | Bounded context | BE deliverables | FE deliverables | Blocked-by |
| --- | --- | --- | --- | --- | --- |
| 0 | **Foundation** | core, common | Migrate `src/modules/` → `src/apps/core/`, `BaseRepository`, `audit_logs` table + `@Auditable` interceptor, `isAdmin` + `isAppAdmin` helpers, fix lint FE | Fix 2 lỗi lint pre-existing, sidebar nav slot cho HRM/Attendance/Requests (disabled cho đến khi feature implement) | — |
| 1 | **Auth + Org + User + AppAdmin** | core, platform, hrm | `Organization`, mở rộng `User` (`role`, `title`, `organizationId`, `employeeId`), `AppAdmin` model + module gán/xoá (admin Org gán cho user role=user), signup flow Org | Trang đăng ký Org (tạo Org + admin user), trang `/settings/organization`, trang `/settings/app-admins` (admin Org grant/revoke), profile edit (set `User.title`) | 0 |
| 2 | **HRM core: Department + Employee + OrgChart** | hrm | `Department` (nested + manager), `Employee` (departmentId, title, soft-delete, link User↔Employee), `OrgChartService` (CTE chain query, `getApproverCandidates`), `/orgchart` endpoints | `features/employees/` (list, search, profile), `features/departments/` (CRUD + tree picker), `features/orgchart/` 2 view React Flow (reporting line + department structure) | 1 |
| 3 | **Attendance: WorkSchedule + Device + Log + Timesheet UI** | attendance | `WorkSchedule` config, `AttendanceDevice` registry + push endpoint, `AttendanceLog` (composite unique `employee_id, date`, idempotent qua `device_log_id`), adapter pattern (`ZKTecoAdapter`, `HikvisionAdapter`), `Timesheet` query API trả về log theo tháng | `/settings/work-schedule`, `/settings/attendance-devices`, `/timesheet` (calendar tháng theo ảnh user gửi — grid 7 cột, mỗi ô check-in/out + clock icon), `/timesheet/team` cho HR/manager xem team | 2 |
| 4 | **Requests: LeaveRequest + AttendanceCorrection** | requests | Module `requests/leave-request/` + `requests/attendance-correction/`, state machine `PENDING → APPROVED/REJECTED/CANCELLED`, approve workflow dùng `OrgChartService.getApproverCandidates`, approve `AttendanceCorrection` → tạo/update `AttendanceLog` source `CORRECTION`, mail notification async, `@Auditable` cho approve/reject | `features/leave/` (list filtered by role, create form với approver dropdown, detail + approve/reject UI), `features/attendance-correction/` tương tự, badge số đơn pending trên sidebar | 2, 3 |

Mỗi feature **kết thúc xanh khi**:

- BE: `pnpm --filter @c-hr/backend build` xanh, migration applied, swagger có endpoint mới, test integration cross-Org pass (vd tạo employee Org A, login Org B trả 403/404).
- FE: `pnpm --filter @c-hr/frontend check` xanh, route mới reachable, smoke test manual qua browser.
- Audit log entries tạo đúng cho action thay đổi.

## Feature 0 — Foundation

Dọn nền + thêm building block dùng chung.

### BE

- [ ] **Migrate folder structure** (theo [ADR 0005](apps/backend/docs/project/decisions/0005-folder-structure-bounded-contexts.md)):
  - `git mv src/modules/auth → src/apps/core/auth`
  - `git mv src/modules/user → src/apps/core/user`
  - `git mv src/modules/health → src/apps/core/health`
  - Tạo `src/apps/core/core.module.ts` (re-export Auth/User/Health module)
  - Update `src/app.module.ts`: `imports: [CoreModule, …]`
  - Update `tsconfig.json` paths: drop `@modules/*`, add `@apps/*`
  - Update `package.json` jest `moduleNameMapper`
  - `pnpm build` xanh
- [ ] **`BaseRepository<T>` generic** trong `src/common/repository/base.repository.ts` với method chuẩn (`findManyByOrg`, `findByIdByOrg`, `createForOrg`, `updateByOrg`, `softDeleteByOrg`, `*Raw` variants). Dùng generic `<TModel, TWhereInput, TCreateInput, TUpdateInput>`.
- [ ] **`audit_logs` table** + `@Auditable()` decorator + `AuditInterceptor` (xem [ADR 0002](apps/backend/docs/project/decisions/0002-audit-log.md)). Write async qua `@nestjs/event-emitter`. Redact danh sách field nhạy cảm cấu hình trong `AuditableOptions`.
- [ ] **`isAdmin` + `isAppAdmin` helpers** trong `src/common/auth/access.ts` (xem [ADR 0003](apps/backend/docs/project/decisions/0003-no-permission-engine.md)) — `isAdmin(user, orgId)` cho admin Org, `isAppAdmin(user, app, orgId)` cho appadmin (admin tự pass). Chưa enforce ở Feature 0, chuẩn bị cho Feature 1.
- [ ] **Prisma schema convention check**: thêm rule lint custom hoặc check thủ công — mọi model phải có `@@map`, mọi field non-id phải có `@map` nếu camelCase. (Optional script: `scripts/check-prisma-naming.js`.)

### FE

- [ ] Fix [`apps/frontend/src/features/auth/views/VerifyOtpView.tsx:47`](apps/frontend/src/features/auth/views/VerifyOtpView.tsx#L47) — bỏ `setShake/setCode` ra khỏi useEffect body.
- [ ] Fix [`apps/frontend/src/features/dashboard/views/HomeView.tsx:15`](apps/frontend/src/features/dashboard/views/HomeView.tsx#L15) — bỏ import `Button` không dùng.
- [ ] `pnpm --filter @c-hr/frontend check` xanh.
- [ ] `<DashboardShell>` sidebar — thêm slot nav cho HRM (Employees, Departments, OrgChart), Attendance (Timesheet, Devices, Schedules), Requests (Leave, Corrections), Settings (Organization, AppAdmins). Disabled link đến khi feature implement, enable qua flag.

### Done-when

- Migrations applied (`audit_logs` exist).
- Folder migrate xong, BE build + smoke test xanh.
- FE check xanh.
- Helper `isAppAdmin` có unit test.

## Feature 1 — Auth + Organization + User + AppAdmin

Chuyển app từ "1 hệ thống User" → "Org multi-tenant với 3 role (`sysowner`, `admin`, `user`) + AppAdmin per-app cho user `role=user`".

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
  - `OrgChartService` với raw SQL CTE (xem [ADR 0004](apps/backend/docs/project/decisions/0004-orgchart-source-of-truth.md)).
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
    brand           DeviceBrand
    serialNumber    String      @map("serial_number")
    token           String                                  // bcrypt hashed
    name            String
    ipAddress       String?     @map("ip_address")
    lastSeenAt      DateTime?   @map("last_seen_at")
    isActive        Boolean     @default(true) @map("is_active")
    createdAt       DateTime    @default(now()) @map("created_at")
    updatedAt       DateTime    @updatedAt       @map("updated_at")
    @@unique([organizationId, serialNumber])
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
    deviceLogId     String?  @map("device_log_id")           // idempotency
    note            String?
    createdAt       DateTime @default(now()) @map("created_at")
    updatedAt       DateTime @updatedAt       @map("updated_at")
    @@unique([employeeId, date])
    @@unique([deviceId, deviceLogId])
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
  - `POST /api/v1/attendance-devices/push` — public endpoint, body có `serial_number` + `token` + array events.
    - Adapter chọn theo `device.brand`: `ZKTecoAdapter`, `HikvisionAdapter`, `SupremaAdapter`, `OtherAdapter`.
    - Adapter parse → `AttendanceEvent[] { employeeCode, timestamp, type: IN|OUT }`.
    - Service upsert `AttendanceLog` theo `(employeeId, date)`: nếu chưa có → create; nếu có → update `checkInAt = MIN(existing, new)`, `checkOutAt = MAX(existing, new)`.
    - Idempotent qua `(deviceId, deviceLogId)` unique — replay không tạo dup.
    - Update `device.lastSeenAt`.
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
- [ ] Adapter pattern code — interface trong `src/apps/attendance/attendance-device/adapters/`:
  ```typescript
  export interface AttendanceDeviceAdapter {
    parse(payload: unknown): AttendanceEvent[];
  }
  ```
  Implementation chi tiết cho ZKTeco (lib `node-zklib`), Hikvision (HTTP ISAPI JSON), Suprema (BioStar webhook), Other (generic JSON contract `{events:[{code,time,type}]}`).

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
  - `/timesheet/team` — chọn employee để xem (HRM appadmin/manager).
  - Tự build grid với `date-fns` + Tailwind. Time picker custom (Popover + 2 select hour/minute).
- [ ] Sidebar enable Timesheet (cho mọi user — xem mình), Settings → Work Schedule + Devices (chỉ HRM appadmin).

### Done-when

- Cấu hình schedule "T2-T6 + sáng T7" với 2 shift, employee follow → timesheet hiển thị đúng workday + weekend.
- Đăng ký 1 device + generate token.
- Smoke test push: gửi POST với token → log xuất hiện trong timesheet.
- Timesheet hiển thị đúng status theo shift của ngày (PRESENT/LATE/ABSENT/WEEKEND).
- Composite unique enforced (push 2 lần cùng day → update, không create).
- User role=user chỉ xem mình; HRM appadmin xem team.

## Feature 4 — Requests: LeaveRequest + AttendanceCorrection

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
