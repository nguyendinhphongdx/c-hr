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

## Trạng thái hiện tại (cập nhật 2026-05-10)

| # | Feature | Status | Ghi chú |
| --- | --- | --- | --- |
| 0 | Foundation | ✅ done | Folder migration, ESLint flat config, audit infra deferred → F1. Sidebar nav slot enable theo từng feature ship (không còn disabled). |
| 1 | Auth + Org + AppAdmin | ✅ done | Signup Org / me / admin grant/revoke, audit log, isAdmin/isAppAdmin helpers. Login redirect preserve original path (`47e6475`), hydration-safe greeting. |
| 2 | HRM core: Department + Employee + OrgChart | ✅ done | CRUD đủ, OrgChart CTE + approver candidates, EmployeePicker, dept manager auto-link, soft-delete, edit pages. **Mở rộng**: bulk import CSV/XLSX (`employee-import.service.ts`), role column + change-role gated by HRM admin (`e0a230d`), edit code (`8bfe320`), orgchart minimap (`0a16ab1`). |
| 3 | Attendance | ✅ done | BE 4 modules + FE features. **Mở rộng**: month stats row trên calendar (`20c8853`), org-wide attendance report + Excel export + drill-down (`3012048`), orphan device events store + auto-link on Employee create (`fc61858`), JWT device token (migration `f3_jwt_device_token`). |
| 4 | Requests (per-type) | ⛔ superseded | F4 đã build LeaveRequest + AttendanceCorrection riêng — refactor sang F5 universal engine. Tables drop trong migration `f5_universal_requests`. |
| 5 | Requests (universal engine) | ✅ done | RequestGroup + Request polymorphic, `data: Json` validated theo `group.fieldsSchema`. 3 group seed: `leave`, `checkin`, `checkout`. Side-effect registry. ADR 0006. **Mở rộng**: title field (migration `add_request_title`), 3-pane Outlook layout, RequestCreateDialog 2-step thay `/requests/new`, edit/clone/cancel actions, ApprovalFlow compact (`3098838`, `0d553f4`, `e92ea14`). |
| 6 | Collaboration: Comments + Activities | ✅ done | Migration `add_comments_and_activities` applied. BE: `comment` + `activity` modules `@Global`, sanitize-html, fire-and-forget activity log, Request pilot 3 endpoints. FE: Tiptap editor + UnifiedTimeline + ApprovalFlow. **F6.2 ACL refactor**: BaseAcl pattern (`common/acl/base-acl.ts`) + 5 entity ACLs (Department, Employee, Request, Event, Resource) — đã port từ "rework-talent" view interface, không wrap BaseEntity. Commits `12e9da5`, `e39f1d3`, `87b85b1`. |
| 7 | Calendar + Booking | 🚧 partial (7.1–7.3 done, 7.4+ defer) | **Done**: F7.1 events 4-view (week/day/month/agenda với react-big-calendar) + EventCreateDialog 2-step + visibility/isPrivate + attendees + comments wire-in. F7.2 resources (ROOM/EQUIPMENT/VEHICLE) + RoomsView + booking conflict check. F7.3 follow + per-attendee chips + stored follow colors (migration `calendar_follow_color`) + visibility filter. **Bonus**: scheduling assistant + free/busy badges (`aa7ff1e`), CalendarSettingsForm, Preference module ([apps/backend/src/apps/core/preference](../../apps/backend/src/apps/core/preference/)) cho follow defaults. **Chưa làm**: F7.4 OAuth Google/Microsoft sync (không có `external-sync/`, `googleapis`/`microsoft-graph-client` deps), recurrence/rrule (schema comment line 460: "MVP: single events only"), F7.5 Tasks. |
| 8 | Work — Project + Task + Tag generic | ✅ done | App quản lý dự án + task cho team (Linear-class UX + tích hợp HRM). Phase 1A–6 hoàn tất: Tag polymorphic + Project + Task + Kanban Board (@dnd-kit) + Comments/Activity (reuse F6) + My Tasks cross-project + Reports per-project & org-wide. Spec: [work.md](work.md). |
| 9 | Payroll — kỳ lương + BHXH/thuế TNCN VN + payslip Excel | ✅ done | Phase 1-4. Pure-function calculator (5 unit tests), DRAFT→CLOSED→PAID lifecycle, auto-pull Timesheet, free-form allowances/deductions, payslip xlsx per-item + bulk per-period. Migration `f9_payroll_foundation`. |
| — | Dashboard data-driven home | ✅ done (ngoài plan gốc) | Today status + approvals queue + birthdays. Commit `0167cd0`. |
| — | Preference module | ✅ done (ngoài plan gốc) | `Preference` model với `PreferenceScope` enum, registry pattern. Hỗ trợ user-level config (vd calendar follow defaults). Migration `add_preferences_drop_calendar_default`. |
| — | ZK-Bridge standalone | ✅ done (chuyển từ roadmap → ship) | [services/zk-bridge](../../services/zk-bridge/) là pnpm package độc lập publishable, có CLI entry, env reload, defuse orphan ZK waiters. Commits `4328c48`, `fbb721a`, `92b6a0f`. |

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
2. ✅ **`audit_logs.entity_id` empty cho CREATE actions** — fixed 2026-05-06. `AuditInterceptor.extractId` giờ đọc cả raw service-return shape (`{id, …}`) và `TransformInterceptor`-wrapped shape (`{success, data: {id, …}}`); `req.params.id` vẫn ưu tiên cho UPDATE/DELETE.
3. ✅ **Error envelope code label** — fixed 2026-05-06. `AllExceptionsFilter` (catches first do registration order) giờ dùng cùng status→code map như `HttpExceptionFilter`.
4. ✅ **Timezone status logic** — fixed `43247db`. `deriveStatus` đọc wall-clock theo `Organization.timezone` qua `Intl.DateTimeFormat`.

### Manual UI smoke (chờ demo qua browser)

- `/settings/work-schedule` — render form, add/remove shift, save thành công
- `/settings/attendance-devices` — tạo device, modal show plaintext token 1 lần
- `/timesheet` — calendar grid render đúng, today highlight, hover popover (admin time picker)
- `/settings/profile` — patch User dob/gender/phone OK
- `/employees/new` + `[id]/edit` — UserPicker hoạt động, name hiển thị từ User

## Gap còn lại sau sync 2026-05-10

Liệt kê các item đã ghi defer trong plan + phát sinh trong quá trình ship — chưa làm, ưu tiên giảm dần.

### Cao — đáng làm sớm (mỗi mục có plan riêng)

- [ ] **F7.4 — External calendar sync** (Google + Microsoft, 1-way pull) → [f7-4-external-sync.md](f7-4-external-sync.md)
- [ ] **F7 — Recurrence (RRULE)** → [f7-recurrence.md](f7-recurrence.md)
- [ ] **F5.2 — Form-builder UI** cho RequestGroup → [f5-2-form-builder.md](f5-2-form-builder.md)
- [ ] **F5 — Email notifications** cho Request lifecycle → [f5-email-notifications.md](f5-email-notifications.md)
- [ ] **F5 — Sidebar pending-count badge** → [f5-pending-badge.md](f5-pending-badge.md)
- [ ] **F3 — Multi-event push idempotency** (tách `attendance_events`) → [f3-multi-event-idempotency.md](f3-multi-event-idempotency.md)

### Trung bình — khi mở rộng (mỗi mục có plan riêng)

- [ ] **F6.3 — Mention picker + notifications** → [f6-3-mentions.md](f6-3-mentions.md)
- [ ] **F6.4 — Comment moderation** (HRM appadmin xoá comment người khác) → [f6-4-comment-moderation.md](f6-4-comment-moderation.md)
- [ ] **F6.5 — Comment rollout** sang Event / Employee / Department → [f6-5-comment-rollout.md](f6-5-comment-rollout.md)
- [ ] **F6.6 — Activity feed dashboard** (`/activities` cho HR) → [f6-6-activity-feed.md](f6-6-activity-feed.md)
- [ ] **F7.5 — Tasks** ("Việc cần làm") tab → [f7-5-tasks.md](f7-5-tasks.md)
- [ ] **F5 — Leave-balance** entity + accrual + deduct on approve → [f5-leave-balance.md](f5-leave-balance.md)
- [ ] **F5 — Resizable master-detail panel** cho `/requests` → [f5-resizable-panel.md](f5-resizable-panel.md)

### Thấp — roadmap dài hơi (gộp 1 file)

17 mục defer (F7.6 2-way sync, F7.7 real-time WS + reminders, F7.8 floor plan, F7.9 multi-TZ, F7.10 recurring UX, F7.11 booking approval, F7-leave conflict, audit viewer, performance reviews, documents upload, mobile, WORK app, payroll, multi-currency, multi-step approval, OOO delegate, accrual detail) → xem [roadmap.md](roadmap.md).

## Thứ tự implement

| # | Feature | Bounded context | BE deliverables | FE deliverables | Blocked-by |
| --- | --- | --- | --- | --- | --- |
| 0 | **Foundation** | core, common | Migrate `src/modules/` → `src/apps/core/`, `BaseRepository`, `audit_logs` table + `@Auditable` interceptor, `isAdmin` + `isAppAdmin` helpers, fix lint FE | Fix 2 lỗi lint pre-existing, sidebar nav slot cho HRM/Attendance/Requests (disabled cho đến khi feature implement) | — |
| 1 | **Auth + Org + User + AppAdmin** | core, platform, hrm | `Organization`, mở rộng `User` (`role`, `title`, `organizationId`, `employeeId`), `AppAdmin` model + module gán/xoá (admin Org gán cho user role=user), signup flow Org | Trang đăng ký Org (tạo Org + admin user), trang `/settings/organization`, trang `/settings/app-admins` (admin Org grant/revoke), profile edit (set `User.title`) | 0 |
| 2 | **HRM core: Department + Employee + OrgChart** | hrm | `Department` (nested + manager), `Employee` (departmentId, title, soft-delete, link User↔Employee), `OrgChartService` (CTE chain query, `getApproverCandidates`), `/orgchart` endpoints | `features/employees/` (list, search, profile), `features/departments/` (CRUD + tree picker), `features/orgchart/` 2 view React Flow (reporting line + department structure) | 1 |
| 3 | **Attendance: WorkSchedule + Device + Log + Timesheet UI** | attendance | `WorkSchedule` config, `AttendanceDevice` registry + push endpoint, `AttendanceLog` (composite unique `employee_id, date`, idempotent qua `event_log_id`), `Timesheet` query API trả về log theo tháng. **MVP simplified:** generic JSON push contract, no brand adapter. | `/settings/work-schedule`, `/settings/attendance-devices`, `/timesheet` (calendar tháng — grid 7 cột, mỗi ô check-in/out + status badge). `/timesheet/team` deferred. | 2 |
| 4 | ⛔ **Requests per-type** (superseded by F5) | requests | Đã build `LeaveRequest` + `AttendanceCorrection` rời. Refactor sang universal engine F5 vì cần mở rộng linh hoạt cho các loại đơn khác (OT, OOO, …). Drop trong migration `f5_universal_requests`. | — | — |
| 5 | **Requests: Universal engine + form-builder defer** | requests | `RequestGroup` (system-wide, `fieldsSchema` JSON) + `Request` polymorphic. Validation engine self-built. Side-effect registry keyed by group code (checkin/checkout upsert AttendanceLog). 3 group seed: `leave`, `checkin`, `checkout`. ADR 0006. | `/requests` master-detail (list + preview pane). `DynamicForm` render từ `fieldsSchema`. `/requests/new` chọn group → form. Sidebar gộp 1 link "Requests". | 2, 3 |
| 6 | **Collaboration: Comments + Activities** (generic, polymorphic) | collaboration (new bounded context) | Bảng `comments` (richtext HTML sanitize) + `activities` (append-only event log), polymorphic `objectType + objectId + userId`. 2 module `@Global` (CommentService + ActivityService). CommentService auto-emit `<object>.commented` activity. Sanitize HTML qua `sanitize-html`. Wire-in pilot vào Request module (3 endpoint: `/requests/:id/comments` GET+POST, `/requests/:id/activities` GET). | Tiptap richtext editor cho comment, timeline panel bên phải `RequestPreview` (FE merge 2 stream comments + activities theo `createdAt`), `<ApprovalFlow>` component (avatar from→to + status arrow) dùng ở list row + detail header. | 5 |
| 7 | **Calendar + Booking** (event + resource + follow + sync) | calendar (new bounded context) | Schema: `Event`, `EventAttendee`, `Resource`, `CalendarFollow`, `ExternalCalendarLink`. Phase 7.1: events CRUD + recurrence (rrule) + conflict check + 3 endpoint (`/events`, `/events/:id`, `/events/range?from&to`). Phase 7.2: resources + booking attendee. Phase 7.3: follow. Phase 7.4: OAuth Google + Microsoft 1-way sync. | Lib `react-big-calendar` cho 4 view (day/week/month/list/agenda). 2 tab: "Lịch" + "Phòng họp". Sidebar trái: mini-cal + search-user + Quản lý/Theo dõi (checkbox bật/tắt overlay) + Lịch từ Google + Lịch từ Microsoft. Modal tạo event 2 step (chọn loại → form). | 6 |

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

- [x] Fix [`apps/frontend/src/features/auth/components/LoginForm.tsx`](apps/frontend/src/features/auth/components/LoginForm.tsx) — 2 errors `react-hooks/set-state-in-effect`. (Resolved by F1-F5 work; verified 2026-05-06.)
- [x] Fix [`apps/frontend/src/features/auth/components/RegisterForm.tsx`](apps/frontend/src/features/auth/components/RegisterForm.tsx) — error tương tự. (Resolved by F1-F5 work.)
- [x] Fix [`apps/frontend/src/features/auth/views/VerifyOtpView.tsx:47`](apps/frontend/src/features/auth/views/VerifyOtpView.tsx#L47) — bỏ `setShake/setCode` ra khỏi useEffect body. (Resolved by F1-F5 work.)
- [x] Fix [`apps/frontend/src/features/dashboard/views/HomeView.tsx:15`](apps/frontend/src/features/dashboard/views/HomeView.tsx#L15) — bỏ import `Button` không dùng. (Resolved by F1-F5 work.)
- [x] `pnpm --filter @c-hr/frontend check` xanh. (Verified 2026-05-06: 0 errors, 1 unrelated `react-hooks/incompatible-library` warning on `EmployeeCreateDialog.tsx` re `form.watch()` — not in F0 scope.)
- [x] `<DashboardShell>` sidebar — slot nav HRM/Attendance/Requests/Calendar/Settings, enable theo feature ship. Hiện không còn link disabled (mọi context F1–F7.3 đã ship).

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

## Feature 6 — Collaboration: Comments + Activities

Generic comment + activity log gắn vào bất kỳ object nào trong hệ thống (Request đầu tiên; sau là Employee, Department, Project, …). Tránh tạo bảng comment/activity riêng cho mỗi entity (anti-pattern: 5 entity = 5 bảng giống nhau). Tham khảo pattern [rework-talent](file:///Users/dinhphong/Documents/Base.vn/rework-talent/apps/api) — `ActivityLog` của họ generic ✓, nhưng `ProposalComment` per-entity ✗ (không scale tốt cho HRM nhiều entity).

### Design rationale

- **Polymorphic**: `objectType: String` (tên Prisma model — `"Request"`, `"Employee"`) + `objectId: String` + `userId: String` (actor). Không có FK đến target — trade-off chấp nhận để generic.
- **Hai bảng tách** (không gộp 1 bảng):
  - `comments`: mutable (edit/delete/thread), body lớn (HTML), có `editedAt` + soft-delete
  - `activities`: immutable append-only, payload nhẹ (metadata Json), không edit
  - Gộp 1 bảng → activity bloat khi user edit + index dày không cần thiết
- **Hai module `@Global`** trong bounded context mới `apps/collaboration/`: feature module bất kỳ inject `CommentService` + `ActivityService` thay vì copy-paste CRUD.
- **Route per-feature, service generic**: mỗi feature có route riêng (`/requests/:id/comments`, `/employees/:id/comments`) load entity của chính mình + check permission, **delegate** CRUD cho `CommentService`. Tránh route generic `POST /comments` vì cần ACL theo từng object class.
- **CommentService auto-emit activity**: khi comment.create thành công → `ActivityService.log({ action: '<objectType.toLowerCase()>.commented', metadata: { commentId, preview } })`. Feature module không phải tự log "commented".
- **FE merge 2 stream**: gọi `/comments` + `/activities` song song, sort theo `createdAt` để render unified timeline (Slack/Linear style). Đơn giản hơn 1 endpoint trả heterogeneous.
- **ACL deferred**: pattern [AclCalculator](file:///Users/dinhphong/Documents/Base.vn/rework-talent/apps/api/src/common/domain/base.acl.calculator.ts) + view interface (port từ rework-talent, **không** wrap BaseEntity) sẽ làm PR riêng. V1 dùng inline check `isRequester || isApprover || isHrmAppAdmin` cho 3 endpoint Request, comment author tự sửa/xoá của mình. ADR ghi lại sau khi pilot.

### Open decisions (cần chốt trước khi code)

| # | Câu hỏi | Default đề xuất |
| --- | --- | --- |
| D1 | Edit window comment | **15 phút** + tag `(đã sửa)` indicator. Cân bằng giữa fix typo và audit trail. Slack/Discord không giới hạn — không phù hợp cho HR audit. |
| D2 | `isInternal` default | **`false`** (transparent) — requester thấy mọi comment. HR muốn private thì tick checkbox "Nội bộ" trước khi gửi. |
| D3 | Mentions v1 scope | **Lưu+render thuần** — FE accept `mentions: [{userId, name}]` từ tiptap, BE store snapshot. Không có picker UI / autocomplete / notification. V2 thêm sau. |
| D4 | Soft-delete display | **Placeholder `"[Đã xoá]"`** giữ vị trí trong thread. Slack/Linear cùng pattern — tránh thread "rỗng" giữa chừng làm mất context. |

### BE — Schema

```prisma
// Generic comment — gắn vào bất kỳ object nào.
model Comment {
  id             String    @id @default(uuid())
  organizationId String    @map("organization_id")

  /// Tên Prisma model (Pascal): "Request", "Employee", "Department", ...
  objectType     String    @map("object_type")
  objectId       String    @map("object_id")

  userId         String    @map("user_id")              // commenter
  bodyHtml       String    @db.Text @map("body_html")   // sanitized HTML
  bodyText       String    @db.Text @map("body_text")   // plain mirror — preview/notify/search
  mentions       Json?                                   // [{ userId, name }] snapshot

  parentId       String?   @map("parent_id")            // 1-level threading
  parent         Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies        Comment[] @relation("CommentReplies")

  isInternal     Boolean   @default(false) @map("is_internal")

  editedAt       DateTime? @map("edited_at")
  deletedAt      DateTime? @map("deleted_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt      @map("updated_at")

  user           User      @relation(fields: [userId], references: [id])

  @@index([organizationId, objectType, objectId, createdAt(sort: Desc)])
  @@index([userId])
  @@index([parentId])
  @@map("comments")
}

// Generic activity — append-only event log.
model Activity {
  id             String   @id @default(uuid())
  organizationId String   @map("organization_id")

  objectType     String   @map("object_type")
  objectId       String   @map("object_id")
  objectLabel    String?  @map("object_label")          // snapshot text cho feed

  /// Dotted: "request.created", "request.commented",
  /// "request.side_effect.checkin_corrected"
  action         String

  userId         String?  @map("user_id")               // null = system action
  metadata       Json?                                   // payload tuỳ ý theo action

  createdAt      DateTime @default(now()) @map("created_at")

  user           User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([organizationId, objectType, objectId, createdAt(sort: Desc)])
  @@index([userId])
  @@index([action])
  @@map("activities")
}
```

Thêm relation ngược ở `User`:

```prisma
comments   Comment[]
activities Activity[]
```

Migration: `add_comments_and_activities`. Không touch table khác.

### BE — Module layout

```text
apps/backend/src/apps/collaboration/
├── collaboration.module.ts          # imports CommentModule + ActivityModule, re-export
├── comment/
│   ├── comment.module.ts            # @Global() — service inject vào mọi feature
│   ├── comment.controller.ts        # PATCH/DELETE /comments/:id (author self-ops)
│   ├── comment.service.ts           # sanitize, CRUD, emit activity 'X.commented'
│   ├── comment.repository.ts
│   ├── comment.types.ts             # CommentDto, CreateCommentInput, ...
│   ├── sanitize.ts                  # sanitize-html wrapper, htmlToText helper
│   └── dto/
│       ├── create-comment.dto.ts
│       ├── update-comment.dto.ts
│       └── index.ts
└── activity/
    ├── activity.module.ts           # @Global()
    ├── activity.service.ts          # log() fire-and-forget, listFor, logMany
    ├── activity.repository.ts
    ├── activity.types.ts
    └── dto/
        ├── log-activity.dto.ts
        └── index.ts
```

`AppModule` import `CollaborationModule`.

### BE — CommentService API

```ts
interface CreateCommentInput {
  organizationId: string;
  objectType: string;
  objectId: string;
  userId: string;
  bodyHtml: string;                // raw HTML từ tiptap, sẽ sanitize trong service
  parentId?: string;
  isInternal?: boolean;
  mentions?: Array<{ userId: string; name?: string }>;
}

interface UpdateCommentInput {
  bodyHtml: string;
  mentions?: Array<{ userId: string; name?: string }>;
}

interface ListCommentsOptions {
  parentId?: string | null;        // null = top-level only; undefined = flat all
  limit?: number;                  // default 50
  cursor?: string;
}

class CommentService {
  // Feature module gọi sau khi check user có quyền comment object
  async create(input: CreateCommentInput): Promise<CommentDto>;
  async update(id: string, userId: string, input: UpdateCommentInput): Promise<CommentDto>;
  async softDelete(id: string, userId: string, allowModeration?: boolean): Promise<void>;

  async listFor(orgId: string, objectType: string, objectId: string, opts?: ListCommentsOptions): Promise<CommentDto[]>;
  async findById(id: string): Promise<CommentDto | null>;
  async countFor(orgId: string, refs: Array<{ objectType; objectId }>): Promise<Map<string, number>>;
}
```

**Logic chính**:

- `create`: sanitize bodyHtml → derive bodyText → validate `parentId` (cùng object, parent không có grandchild) → save → emit activity `<objectType.toLowerCase()>.commented`
- `update`: check `userId === comment.userId` + within `EDIT_WINDOW_MS` (15 phút), set `editedAt = now`
- `softDelete`: set `deletedAt`. FE thấy placeholder `"[Đã xoá]"`. Cross-author delete (moderation) qua flag `allowModeration` — feature controller check ACL trước khi pass.
- `countFor`: bulk count cho list view (badge "5 comments")

### BE — Sanitize HTML

```ts
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'code', 'pre',
  'blockquote',
  'ul', 'ol', 'li',
  'h2', 'h3',
  'a',
  'span',  // mention pill
];

export function sanitize(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['data-mention-user-id', 'data-mention-name', 'class'],
      code: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  });
}

export function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
```

Strip mọi `<script>`, `<style>`, inline event handlers, `javascript:` URLs. Auto-add `rel="noopener noreferrer"` cho link external.

### BE — ActivityService API

```ts
interface LogActivityInput {
  organizationId: string;
  objectType: string;
  objectId: string;
  action: string;                  // "request.created" | ...
  userId?: string;                 // null = system
  objectLabel?: string;
  metadata?: Record<string, unknown>;
}

class ActivityService {
  /** Fire-and-forget. Không bao giờ throw — error chỉ log. */
  log(input: LogActivityInput): void;
  async logMany(inputs: LogActivityInput[]): Promise<void>;
  async listFor(orgId: string, objectType: string, objectId: string, opts?: ListActivitiesOptions): Promise<ActivityDto[]>;
}
```

**Fire-and-forget**: `log()` return `void`, internal `repo.create().catch(err => logger.error(...))`. Không break main flow nếu activity log fail.

### BE — Action naming convention

Format: `<object>.<verb>` lowercase, nested cho side-effect.

| Action | Khi nào | metadata |
| --- | --- | --- |
| `request.created` | Tạo đơn | `{ groupCode, approverId }` |
| `request.approved` | Duyệt | `{ decisionNote }` |
| `request.rejected` | Từ chối | `{ decisionNote }` |
| `request.cancelled` | Huỷ | `{}` |
| `request.commented` | Có comment mới (auto từ CommentService) | `{ commentId, preview }` |
| `request.side_effect.checkin_corrected` | Side-effect approve checkin | `{ employeeId, date, checkInAt }` |
| `request.side_effect.checkout_corrected` | Side-effect approve checkout | `{ employeeId, date, checkOutAt }` |

Khi rollout sang object khác: `employee.profile_updated`, `department.member_added`, …

### BE — Endpoints

**Generic** (`CommentController`):

```text
PATCH  /comments/:id     { bodyHtml, mentions? }    — author edit own (15min window)
DELETE /comments/:id                                 — author delete own (soft-delete)
```

**Per-feature** (Request pilot — `RequestController` thêm 3 method):

```text
GET    /requests/:id/comments                        — list, group theo parentId
POST   /requests/:id/comments  { bodyHtml, parentId?, isInternal?, mentions? }
GET    /requests/:id/activities                      — timeline activity riêng
```

V1 ACL inline (chưa refactor sang AclCalculator):

- `GET comments`/`GET activities`: `isRequester || isApprover || isHrmAppAdmin`
- `POST comments`: cùng rule trên (viewer = commenter)

### BE — Wire-in `RequestService`

Thêm `activities.log({...})` sau commit DB tại 4 method (`create`, `approve`, `reject`, `cancel`) + 2 side-effect handler (`applyCheckinCorrection`, `applyCheckoutCorrection`). Comment auto-log đã handled bởi CommentService.

### FE — Tiptap richtext editor

```text
apps/frontend/src/features/collaboration/
├── components/
│   ├── CommentEditor.tsx        # tiptap StarterKit + toolbar (B I U • code link blockquote)
│   ├── CommentList.tsx          # render array CommentDto, threading 1-level
│   ├── CommentItem.tsx          # 1 comment + edit/delete buttons
│   ├── ActivityTimeline.tsx     # render array ActivityDto + icon per action type
│   ├── UnifiedTimeline.tsx      # merge comments + activities theo createdAt
│   └── ApprovalFlow.tsx         # <Avatar requester/> ──→ <Avatar approver/> + status icon
├── hooks/
│   ├── useObjectComments.ts     # generic — useQuery(['comments', objectType, objectId])
│   └── useObjectActivities.ts   # generic
├── services/
│   ├── commentService.ts
│   └── activityService.ts
└── types/
    └── index.ts                  # CommentDto, ActivityDto, mention types
```

Dependencies cần thêm:

- `@tiptap/react` + `@tiptap/starter-kit` (B/I/U, lists, headings, links, blockquote, code) — lazy import qua `dynamic()` để không bloat first-load
- `@tiptap/extension-link` — auto-link
- (v2) `@tiptap/extension-mention` cho picker

### FE — Pilot Request integration

1. **`RequestPreview` panel** (right side hiện tại) thêm 3 section:
   - `<ApprovalFlow requester={r.requester} approver={r.approver} status={r.status} />` thay header text "Người gửi/duyệt" cũ
   - `<UnifiedTimeline objectType="Request" objectId={r.id} />` ở dưới `DynamicDataView`
   - `<CommentEditor onSubmit={...} />` ở cuối panel
2. **`RequestListView` rows**: thêm `<ApprovalFlow size="sm" />` thay 2 dòng text requester/approver hiện tại.
3. Có thể xét refactor sang **3-pane Outlook layout** (sidebar lọc + dense list + detail) trong cùng PR hoặc PR sau — quyết định khi user xác nhận scope.

### Done-when

- BE: `pnpm --filter @c-hr/backend build` xanh, migration `add_comments_and_activities` applied, swagger có `/comments/:id` (PATCH/DELETE), `/requests/:id/comments` (GET/POST), `/requests/:id/activities` (GET).
- FE: `pnpm --filter @c-hr/frontend check` xanh, route `/requests` render comment editor + timeline + ApprovalFlow.
- Smoke E2E (curl):
  - [ ] `POST /requests/:id/comments` → comment lưu, body sanitize (test với `<script>alert(1)</script>` → strip)
  - [ ] `GET /requests/:id/comments` → trả comment vừa tạo
  - [ ] `GET /requests/:id/activities` → có `request.commented` event tự động sau POST comment
  - [ ] `PATCH /comments/:id` trong 15 phút → 200, có `editedAt`
  - [ ] `PATCH /comments/:id` sau 15 phút → 403 "Quá hạn sửa"
  - [ ] `DELETE /comments/:id` author → 200 soft-delete, FE thấy `"[Đã xoá]"`
  - [ ] `POST /requests/:id/approve` → activity `request.approved` được log
- Smoke UI:
  - User A tạo đơn → A thấy comment editor + timeline empty
  - User A comment "test" → activity `request.commented` xuất hiện trong timeline
  - User B (approver) comment lại → A thấy comment B trong cùng thread
  - B approve đơn → timeline có `request.approved` + `request.side_effect.*` (nếu checkin/checkout)
  - A sửa comment trong 15 phút → "(đã sửa)" indicator
  - A xoá comment → "[Đã xoá]" placeholder

### Defers (F6.x / future)

- **F6.2 — ACL refactor**: port `AclCalculator<TView, TAcl>` + `BaseAcl` + `EntityContext` từ rework-talent vào `common/domain/`. Tạo `RequestAclCalculator` + `RequestAclView` interface. Refactor `RequestService.assertCanView/decide/cancel` + 3 comment/activity endpoint sang dùng calculator. ADR mới ("Object-owned ACL, no BaseEntity wrap"). Risk: refactor không nhỏ — tách PR riêng.
- **F6.3 — Mention picker + notifications**: `@tiptap/extension-mention` + endpoint `GET /users/search?q=&inOrg=true` + push notification khi được mention.
- **F6.4 — Comment moderation**: HRM appadmin xoá comment người khác (cross-author). Cần `ObjectLoaderRegistry` để load object và check ACL `canDeleteAnyComment`.
- **F6.5 — Rollout cho object khác**: `Employee` (HR note hồ sơ), `Department` (manager note), tương lai Project/Performance. Mỗi object thêm 3 route + 1 ACL calculator, không touch CommentService/ActivityService.
- **F6.6 — Activity feed dashboard**: trang `/activities` cho HRM appadmin xem stream toàn Org (filter theo action, user, time range). Tận dụng index `(organizationId, createdAt DESC)`.
- **Audit log integration**: hiện `audit_logs` (ADR 0002) ghi từ `@Auditable` interceptor cho admin ops; `activities` ghi từ service layer cho user-facing timeline. Hai bảng song song, không gộp — audit_logs cho compliance, activities cho UX. Có thể xét gộp sau nếu duplicate quá nhiều.

## Feature 7 — Calendar + Booking

App lịch tích hợp: event/meeting cá nhân/team + đặt tài nguyên (phòng họp / thiết bị / xe) + follow đồng nghiệp xem lịch + sync với Google Calendar + Microsoft Outlook. Thay thế placeholder `/bookings` hiện tại.

Trigger: F6 (Collaboration) sẵn để comment/activity gắn vào event. F1–F5 đã đóng — domain HRM ổn định, có thể mở rộng sang collab tools.

### Layout reference (theo screenshot user cung cấp)

```text
┌─ Header ─────────────────────────────────────────────────────────────────────┐
│ [Lịch] [Phòng họp]   [Hôm nay] ‹ ›  4-10 Tháng 5, 2026 📅      │
│                              [Sự kiện] [Việc cần làm]   [Tuần ▾] [+ Tạo mới]│
├─ Sidebar 280px ──────┬─ Main calendar flex ──────────────────────────────────┤
│ ◂ Tháng 5, 2026 ▸    │  T2  T3  T4  T5  T6  T7  CN                          │
│  T2 T3 T4 T5 T6 T7 CN│  04  05  06* 07  08  09  10                          │
│  27 28 29 30  1  2 3 │ ┌────┬────┬────┬────┬────┬────┬────┐                 │
│   4  5 [6] 7 8 9 10  │ │10:00│   │   │   │   │   │   │                       │
│  11 12 13 14 15...   │ │11:00│   │   │   │   │   │   │                       │
│                      │ │12:00│   │   │   │   │   │   │                       │
│ 🔍 Tìm người    [+]  │ │ ... │   │   │   │   │   │   │                       │
│                      │ │20:00│   │ ▓ │ ▓ │   │   │   │                       │
│ ▾ Quản lý            │ │21:00│   │ ▓ │ ▓ │   │   │   │                       │
│  ☑ Phan Thanh Vũ    │ └────┴────┴────┴────┴────┴────┴────┘                  │
│                      │ ── Now line (red) ──                                   │
│ ▾ Theo dõi (3)       │                                                        │
│  ☑ Long Phạm         │                                                        │
│  ☐ Hoa Nguyễn        │                                                        │
│  ☐ Mai Lê            │                                                        │
│                      │                                                        │
│ ▸ Lịch từ Google  🔄 │                                                        │
│ ▸ Lịch từ Microsoft  │                                                        │
└──────────────────────┴────────────────────────────────────────────────────────┘
```

**View toggle** (`Tuần ▾` dropdown): Ngày · Tuần · Tháng · Danh sách. Mỗi view render khác:

- **Ngày**: 1 cột thời gian, event chiếm full-width — show attendee names
- **Tuần**: 7 cột (Mon–Sun), grid 30-min slot, event drag-drop
- **Tháng**: 7×6 grid, mỗi ô compact event chips (title prefix với time)
- **Danh sách**: vertical list grouped by day, event = row với time range + title + comment count

**2 tab** trên header (`Lịch` / `Phòng họp`): tab "Lịch" hiện calendar bình thường, tab "Phòng họp" đổi context — chọn 1 phòng → calendar chỉ show event của phòng đó (free/busy timeline).

### Open decisions for F7 (cần chốt trước khi code)

| # | Câu hỏi | Default đề xuất |
| --- | --- | --- |
| D1 | Sidebar position | **Trái** (theo screenshot + Google/Outlook convention). User bảo "phải" trong message — confirm lại lúc bắt đầu code, vì là CSS swap đơn giản nếu cần. |
| D2 | Event vs Booking schema | **1 bảng `events`** — booking phòng/xe = event với resource attendee. Tránh 2 bảng song song redundant. |
| D3 | Approval workflow | **Skip MVP** — direct booking + conflict check. Resource không có "owner approve" gate. Nếu sau cần approval (vd phòng VIP), reuse Request engine F5 với group `room_booking`. |
| D4 | Recurrence library | **`rrule` npm** (RFC 5545 compliant) — store `recurrenceRule: String` (RRULE) + `recurrenceUntil`. Expand instance khi query range. |
| D5 | Calendar lib (FE) | **`react-big-calendar`** (~100KB) — đủ 4 view, drag-drop, MIT, đơn giản hơn FullCalendar. FullCalendar có resource view nhưng paid premium. |
| D6 | External sync direction | **1-way pull** v1 (Google + Microsoft → C-HR read-only). 2-way push deferred (cần handle conflicts when both edit). |
| D7 | "Việc cần làm" tab | **Phase sau (F7.5)** — task entity riêng hay reuse Request? Defer. MVP chỉ tab "Sự kiện". |
| D8 | Meeting room types | MVP chỉ 3 kind enum: `ROOM`, `EQUIPMENT`, `VEHICLE`. Custom kinds defer. |
| D9 | Privacy of follow | **Show busy/free only** mặc định cho follower (không thấy title/details của event người khác). User có thể set event là `isPrivate=true` để khoá hoàn toàn. |
| D10 | Conflict policy | **Soft conflict** — tạo được nhưng warning UI. Hard block chỉ khi book cùng resource (phòng/xe) — tránh double-book vật lý. Người thì chỉ warn. |

### BE — Schema (Phase 7.1 + 7.2)

```prisma
enum EventVisibility {
  PUBLIC      // Org-wide visible
  PRIVATE     // Chỉ owner + attendees
  BUSY_ONLY   // Follower thấy busy slot, không title
}

enum AttendeeResponse {
  PENDING
  ACCEPTED
  DECLINED
  TENTATIVE
}

enum ResourceKind {
  ROOM        // Phòng họp
  EQUIPMENT   // Laptop, máy chiếu
  VEHICLE     // Xe
}

enum ExternalProvider {
  GOOGLE
  MICROSOFT
}

model Event {
  id             String          @id @default(uuid())
  organizationId String          @map("organization_id")
  ownerId        String          @map("owner_id")        // Employee tạo

  title          String
  description    String?         @db.Text                 // richtext sau (qua Comment F6 thay vì description?)
  location       String?
  isAllDay       Boolean         @default(false) @map("is_all_day")
  startAt        DateTime        @map("start_at")
  endAt          DateTime        @map("end_at")

  /// RFC 5545 RRULE string (vd "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261231"). NULL = single event.
  recurrenceRule String?         @map("recurrence_rule")
  /// Master event ID (chính nó nếu là master, hoặc trỏ về master nếu là exception override)
  parentEventId  String?         @map("parent_event_id")
  parent         Event?          @relation("EventOverrides", fields: [parentEventId], references: [id], onDelete: Cascade)
  overrides      Event[]         @relation("EventOverrides")

  visibility     EventVisibility @default(PUBLIC)
  color          String?                                  // hex hoặc preset name
  /// External: id từ Google/Microsoft khi pull về — null = local-only
  externalId     String?         @map("external_id")
  externalProvider ExternalProvider? @map("external_provider")

  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt      @map("updated_at")
  deletedAt      DateTime?       @map("deleted_at")        // soft-delete

  owner          Employee        @relation("EventOwner", fields: [ownerId], references: [id])
  attendees      EventAttendee[]
  resources      EventResource[]

  @@index([organizationId, startAt, endAt])
  @@index([ownerId, startAt])
  @@index([externalProvider, externalId])
  @@map("events")
}

model EventAttendee {
  id        String           @id @default(uuid())
  eventId   String           @map("event_id")
  /// Một trong 2: employeeId (nội bộ) hoặc email (khách external)
  employeeId String?         @map("employee_id")
  email     String?
  response  AttendeeResponse @default(PENDING)
  isOptional Boolean         @default(false) @map("is_optional")

  createdAt DateTime         @default(now()) @map("created_at")

  event     Event            @relation(fields: [eventId], references: [id], onDelete: Cascade)
  employee  Employee?        @relation("EventAttendee", fields: [employeeId], references: [id])

  @@unique([eventId, employeeId])
  @@index([employeeId, response])
  @@map("event_attendees")
}

model Resource {
  id             String       @id @default(uuid())
  organizationId String       @map("organization_id")
  kind           ResourceKind
  name           String
  description    String?
  capacity       Int?                                      // chỉ cho ROOM
  color          String?
  isActive       Boolean      @default(true) @map("is_active")

  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt      @map("updated_at")
  deletedAt      DateTime?    @map("deleted_at")

  bookings       EventResource[]

  @@index([organizationId, kind, isActive])
  @@map("resources")
}

model EventResource {
  id         String   @id @default(uuid())
  eventId    String   @map("event_id")
  resourceId String   @map("resource_id")

  createdAt  DateTime @default(now()) @map("created_at")

  event      Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  resource   Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@unique([eventId, resourceId])
  @@index([resourceId])
  @@map("event_resources")
}

model CalendarFollow {
  id           String   @id @default(uuid())
  followerId   String   @map("follower_id")     // Employee xem
  followedId   String   @map("followed_id")     // Employee được xem

  createdAt    DateTime @default(now()) @map("created_at")

  follower     Employee @relation("FollowFollower", fields: [followerId], references: [id], onDelete: Cascade)
  followed     Employee @relation("FollowFollowed", fields: [followedId], references: [id], onDelete: Cascade)

  @@unique([followerId, followedId])
  @@index([followerId])
  @@map("calendar_follows")
}

model ExternalCalendarLink {
  id              String           @id @default(uuid())
  userId          String           @map("user_id")
  provider        ExternalProvider
  externalUserId  String           @map("external_user_id")  // sub claim của OAuth
  /// Encrypted at rest qua libs/crypto. Tham khảo zk-bridge token pattern.
  accessToken     String           @db.Text @map("access_token")
  refreshToken    String?          @db.Text @map("refresh_token")
  expiresAt       DateTime?        @map("expires_at")
  /// Cursor cho incremental sync (Google: syncToken; Microsoft: deltaLink)
  syncToken       String?          @db.Text @map("sync_token")
  lastSyncedAt    DateTime?        @map("last_synced_at")
  isActive        Boolean          @default(true) @map("is_active")

  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt      @map("updated_at")

  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, provider])
  @@index([provider, isActive, lastSyncedAt])
  @@map("external_calendar_links")
}
```

Thêm relation ngược ở `Employee`:

```prisma
events             Event[]            @relation("EventOwner")
eventAttendances   EventAttendee[]    @relation("EventAttendee")
calendarFollowers  CalendarFollow[]   @relation("FollowFollower")
calendarFollowing  CalendarFollow[]   @relation("FollowFollowed")
```

Thêm ở `User`:

```prisma
externalCalendarLinks ExternalCalendarLink[]
```

Migration: `add_calendar_and_booking`. 5 bảng + 4 enum.

### BE — Module layout (calendar)

```text
apps/backend/src/apps/calendar/
├── calendar.module.ts                # imports tất cả sub-modules
├── event/
│   ├── event.module.ts
│   ├── event.controller.ts           # /events CRUD + /events/range query
│   ├── event.service.ts              # conflict check, recurrence expand
│   ├── event.repository.ts
│   ├── recurrence.ts                 # rrule wrapper
│   ├── conflict.ts                   # check overlap với event/resource
│   └── dto/
├── attendee/
│   ├── attendee.controller.ts        # /events/:id/attendees + /attendees/:id/respond
│   ├── attendee.service.ts
│   └── dto/
├── resource/
│   ├── resource.controller.ts        # /resources CRUD (admin)
│   ├── resource.service.ts
│   └── dto/
├── follow/
│   ├── follow.controller.ts          # /calendar-follows POST/DELETE + GET self
│   ├── follow.service.ts
│   └── dto/
└── external-sync/                    # Phase 7.4
    ├── external-sync.module.ts
    ├── google.service.ts             # googleapis client
    ├── microsoft.service.ts          # @microsoft/microsoft-graph-client
    ├── sync.scheduler.ts             # cron — incremental sync mỗi 5 phút
    ├── oauth.controller.ts           # /calendar-links/:provider/connect|disconnect|callback
    └── dto/
```

### BE — Endpoints (calendar)

```text
# Events
GET    /events?from=ISO&to=ISO&ownerId=&resourceId=  — range query, expand recurrence
GET    /events/:id
POST   /events           { title, startAt, endAt, ..., attendees, resourceIds, recurrenceRule? }
PATCH  /events/:id       — sửa single instance hoặc series (qua flag `scope=instance|series`)
DELETE /events/:id?scope=instance|series

# Attendees
POST   /events/:id/attendees   { employeeId? | email?, isOptional? }
DELETE /events/:id/attendees/:attendeeId
POST   /attendees/:id/respond  { response: ACCEPTED|DECLINED|TENTATIVE }

# Resources (HRM appadmin manage)
GET    /resources?kind=ROOM|EQUIPMENT|VEHICLE
GET    /resources/:id
POST   /resources        — chỉ HRM appadmin
PATCH  /resources/:id
DELETE /resources/:id    — soft-delete

# Follows
GET    /calendar-follows           — list của tôi
POST   /calendar-follows           { followedId }
DELETE /calendar-follows/:id

# External sync (Phase 7.4)
GET    /calendar-links             — list provider đã connect
POST   /calendar-links/google/connect       — redirect OAuth
GET    /calendar-links/google/callback      — OAuth callback
POST   /calendar-links/google/sync          — manual trigger sync
DELETE /calendar-links/:provider           — disconnect + delete pulled events

# Tương tự cho microsoft
```

### BE — Conflict detection

`event.service.create/update`:

1. Check time overlap với event khác **của chính owner** → soft warn (return `conflicts: [...]` trong response, FE hiển thị warning nhưng vẫn save).
2. Check time overlap với event khác đã book **cùng resource** → **hard block** (throw `409 Conflict` với detail event nào đang book).
3. Check time overlap với attendee đã có event **mandatory** (không phải optional) → soft warn.

SQL:

```sql
-- Resource conflict (hard)
SELECT e.* FROM events e
JOIN event_resources er ON er.event_id = e.id
WHERE er.resource_id = $1
  AND e.deleted_at IS NULL
  AND e.start_at < $newEnd AND e.end_at > $newStart
  AND e.id != $editingEventId
LIMIT 5;
```

Index `(organizationId, startAt, endAt)` + lateral join với `event_resources` đủ nhanh cho < 100k events. Khi scale lên có thể cân nhắc PostgreSQL `tstzrange` + GIST index `&&` operator.

### BE — Recurrence

Mỗi master event có `recurrenceRule` (RRULE string). Query range expand instances trong khoảng query:

```ts
import { RRule } from 'rrule';

function expandInstances(master: Event, from: Date, to: Date): Event[] {
  if (!master.recurrenceRule) {
    return [master]; // single event
  }
  const rule = RRule.fromString(`DTSTART:${formatRRule(master.startAt)}\n${master.recurrenceRule}`);
  const dates = rule.between(from, to, true);
  const duration = master.endAt.getTime() - master.startAt.getTime();
  return dates.map((d) => ({
    ...master,
    startAt: d,
    endAt: new Date(d.getTime() + duration),
    // virtual instance — có cùng id master, FE phân biệt qua flag
  }));
}
```

**Override** (single instance bị edit/delete trong series): row `events` mới với `parentEventId = master.id` + cùng `startAt = original instance time`. Query expand bỏ instance gốc, dùng override thay thế.

### BE — Wire-in F6 Collaboration

Event là object có thể comment + activity log:

- Comment: `objectType: 'Event'`, `objectId: eventId` — qua `/events/:id/comments` (per-feature route, tương tự Request)
- Activity action: `event.created`, `event.updated`, `event.cancelled`, `event.attendee_responded`, `event.commented` (auto)

### FE — Module layout

```text
apps/frontend/src/features/calendar/
├── components/
│   ├── CalendarShell.tsx        # sidebar + main grid layout
│   ├── MiniCalendar.tsx         # shadcn <Calendar> single-month picker
│   ├── PeopleSearch.tsx         # autocomplete tìm employee để follow
│   ├── ManagedList.tsx          # checkbox toggle "lịch của tôi" (always on)
│   ├── FollowedList.tsx         # checkbox toggle event của followed users
│   ├── ExternalSourceItem.tsx   # connect/disconnect Google/Microsoft
│   ├── EventCard.tsx            # event chip render trong grid
│   ├── EventCreateDialog.tsx    # form tạo/sửa event (title, time, attendees, resource, recurrence)
│   ├── EventDetailPanel.tsx     # right-side / popover detail (title, attendees responses, resource, comments)
│   ├── ResourcePicker.tsx       # multi-select cho phòng/thiết bị/xe
│   ├── AttendeePicker.tsx       # autocomplete employee + ad-hoc email
│   ├── RecurrencePicker.tsx     # daily/weekly/monthly preset + custom rule
│   └── views/
│       ├── DayView.tsx          # react-big-calendar day view wrap
│       ├── WeekView.tsx
│       ├── MonthView.tsx
│       └── AgendaView.tsx       # "Danh sách" — react-big-calendar agenda
├── hooks/
│   ├── useEventsRange.ts
│   ├── useEvent.ts
│   ├── useCreateEvent.ts
│   ├── useFollowedCalendars.ts
│   ├── useExternalLinks.ts
│   └── useCalendarStore.ts      # Zustand: selectedDate, selectedView, toggledFollows[]
├── services/
│   ├── eventService.ts
│   ├── resourceService.ts
│   ├── followService.ts
│   └── externalSyncService.ts
├── types/
│   └── index.ts
└── views/
    ├── CalendarView.tsx         # tab "Lịch" — sidebar + chosen view
    └── RoomView.tsx             # tab "Phòng họp" — chọn phòng → free/busy timeline
```

Dependencies cần thêm:

- `react-big-calendar` + `date-fns` (đã có) cho date math
- `rrule` (FE expand recurrence để hiển thị + BE expand)
- `googleapis` (BE) cho Google OAuth + events API — Phase 7.4
- `@microsoft/microsoft-graph-client` (BE) — Phase 7.4

### FE — Routing

- `/bookings` (đổi nội dung từ placeholder thành `<CalendarView />`)
- `/bookings?tab=rooms` → `<RoomView />`
- `/bookings/events/:id` (deep link, mở detail panel)

Sidebar nav giữ entry "Đặt lịch" hiện tại — chỉ swap content.

### Phasing (5 PR)

| PR | Phase | Deliverable |
| --- | --- | --- |
| 7.1 | Events + 4 view | Schema 2 bảng (Event, EventAttendee), event CRUD, conflict check (no resource), recurrence basic, FE 4 view với react-big-calendar, sidebar mini-cal + managed list |
| 7.2 | Resources + Booking | Schema 2 bảng (Resource, EventResource), resource CRUD, "Phòng họp" tab, ResourcePicker trong EventCreateDialog, hard conflict on resource |
| 7.3 | Follow + visibility | Schema CalendarFollow, follow/unfollow, sidebar FollowedList với checkbox, BE filter visibility theo follower |
| 7.4 | External sync | Schema ExternalCalendarLink, OAuth Google + Microsoft, scheduler cron 5min incremental, sidebar Lịch từ Google/Microsoft + connect button |
| 7.5 | Tasks ("Việc cần làm") | Defer — quyết định reuse Request engine hoặc tạo Task entity riêng |

Mỗi PR ship được độc lập — F7.1 đã có thể demo; F7.2+ là enhancement.

### Done-when (Phase 7.1 — MVP)

- BE: `pnpm --filter @c-hr/backend build` xanh, migration `add_calendar_and_booking_phase1` applied, swagger có `/events`, `/events/:id`, `/events/range`, `/events/:id/attendees`, `/attendees/:id/respond`.
- FE: `pnpm --filter @c-hr/frontend check` xanh, `/bookings` render `<CalendarView />` thay placeholder.
- Smoke E2E (curl):
  - [ ] `POST /events` event đơn → 201
  - [ ] `POST /events` recurring weekly → master row, query range expand instances
  - [ ] `GET /events/range?from=&to=` 1 tuần → trả master + recurrence instances
  - [ ] `POST /events/:id/attendees` → attendee row PENDING
  - [ ] `POST /attendees/:id/respond { response: ACCEPTED }` → row updated
  - [ ] `POST /events` overlap với event của chính owner → 200 + `conflicts: [...]` warning
  - [ ] `PATCH /events/:id?scope=instance` → tạo override row, master không đổi
  - [ ] `DELETE /events/:id?scope=series` → soft-delete master + cascade attendees
- Smoke UI:
  - User mở `/bookings` → CalendarShell render, mini-cal sync với main view
  - Click ngày trong mini-cal → main view nhảy đến ngày
  - Toggle view Tuần/Tháng/Ngày/Danh sách → render đổi đúng
  - Click slot trống → EventCreateDialog mở, pre-fill startAt = slot click
  - Tạo event recurring → hiện đúng instance trên 4 view
  - Drag-drop event sang slot khác (week/day view) → PATCH thành công
  - Click event → detail panel hiện attendee + respond button
  - Mini-cal có dot indicator dưới ngày có event

### Defers (F7.x / future)

- **F7.4 — External sync**: chi tiết OAuth flow, token refresh, incremental delta sync (Google `syncToken`, Microsoft `deltaLink`), conflict khi cùng event tồn tại hai nơi (chọn priority C-HR vs Google).
- **F7.5 — Tasks**: "Việc cần làm" tab. Decision: reuse F5 Request engine với group `task`, hay tạo Task entity riêng? Nếu reuse Request, lifecycle PENDING/APPROVED không match task (không cần approve). Nghiêng tạo `Task` riêng với fields: title, description, dueDate, status (TODO/IN_PROGRESS/DONE), assigneeId.
- **F7.6 — 2-way sync**: tạo event ở C-HR push lên Google. Phức tạp do conflict resolution (last-write-wins? source-of-truth flag?).
- **F7.7 — Notifications**: email reminder X phút trước event. Real-time WebSocket khi attendee respond.
- **F7.8 — Resource floor plan**: visualize phòng họp trên sơ đồ tầng. Defer cho khi >20 phòng.
- **F7.9 — Time-zone proper**: hiện store UTC, render local theo browser TZ. Khi Org có chi nhánh đa-TZ cần "Org timezone" + per-user TZ override.
- **F7.10 — Recurring exceptions UX**: khi user sửa "this event" vs "this and following" vs "all" — Google Calendar pattern. Cần UI rõ ràng.
- **F7.11 — Booking approval workflow**: phòng VIP hoặc xe công ty cần manager approve trước → reuse F5 Request engine với group `room_booking` thay vì direct booking.
- **Conflict với F3 Attendance**: leave request approved (F5 leave) → tự động block calendar slot? Hoặc chỉ show warning. Defer thiết kế.

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

## Workflow mỗi feature (template)

1. Đọc lại ADR liên quan + section domain.md tương ứng.
2. Cập nhật Prisma schema (tuân thủ DB convention) → `pnpm --filter @c-hr/backend exec prisma migrate dev --name <feature>`.
3. BE: tạo module trong `src/apps/<context>/<module>/` (controller, service, repository extends `BaseRepository`, dto). Subagent `module-scaffolder` hỗ trợ.
4. FE: tạo feature trong `src/features/<feature>/`. Subagent `page-scaffolder` hỗ trợ.
5. Implement business logic (tự `if/else` permission, không decorator).
6. `pnpm --filter @c-hr/backend build` + `pnpm --filter @c-hr/frontend check` xanh trước commit.
7. Smoke test manual qua UI (cross-Org isolation cho mọi feature).
8. Commit + (sau này) PR.
