---
title: F8 — Work app (Project + Task)
description: Quản lý dự án + task cho team. Project + Member + Task + Section + Tag generic. Phase 1A (Tag) + 1B (Project) đã đóng; Phase 2–6 là MVP demo bán hàng (~9–13 ngày).
tags: [project, plan, work, task-management, mvp]
---

# F8 — Work app

> **Trạng thái**: Phase 1A (Tag generic) + Phase 1B (Project foundation) — ✅ done. Phase 2 (Task) → Phase 6 (Reports) — 📋 planned.
>
> **Vị trí**: BE bounded context `apps/backend/src/apps/work/`. FE `apps/frontend/src/features/work/`. Tag generic ở `apps/collaboration/tag/` + `features/tags/`.
>
> **Routes**: `/projects` (list) · `/projects/[slug]` (detail) · `/my-tasks` (Phase 5) · `/settings/tags` (admin library).

## Vì sao cần

C-HR đã có HRM + Calendar + Timesheet. App **Work** đóng vòng tròn "đi làm hằng ngày": user đăng nhập sáng → mở Việc của tôi xem task hôm nay → check-in/out → cuối ngày trả lương theo project. Daily-use → user nhớ thương hiệu C-HR mỗi ngày, expand sang HRM/Payroll dễ.

Khoảng trống thị trường:
- Asana / Trello / Linear: international, không VN-localized.
- Base.vn Wework / Misa AMIS Work: VN-localized nhưng UI nặng, copy 2018.
- C-HR Work: **Linear-class UX + tích hợp HRM + tích hợp lương** — chưa ai làm tốt 3 cái cùng lúc ở VN.

## Domain model

Schema: `apps/backend/prisma/schema.prisma`. Tóm tắt:

| Model | Vai trò |
| --- | --- |
| `Project` | Container task. ownerId → **User**. slug 3-8 chars in hoa. taskCounter cho code "PRJ-15". |
| `ProjectMember` | M:N User × Project + role (OWNER / EDITOR / COMMENTER / VIEWER). |
| `TaskSection` | Cột Kanban / nhóm List ("Cần làm", "Đang làm", "Hoàn thành"). |
| `Task` (Phase 2) | parentTaskId (1-level subtask), assigneeId/reporterId → User, dueDate, priority, status, order (float). |
| `TaskWatcher` (Phase 4) | Người follow task → nhận thông báo. |
| `Tag` | Thư viện tag org-scoped (admin manages). color + name + scope?. |
| `TagAssignment` | Polymorphic tag link (`objectType` + `objectId`) — dùng được cho Task/Project/Employee/Event/Resource. Pattern giống `Comment`. |

**Quyết định kiến trúc cứng**:

- **User là entity trung tâm** cho ownership/membership/assignment. KHÔNG dùng Employee — Employee là HR record (code, hire date, dept). User là auth + cross-app identity.
- **Tag generic** thay vì TaskTag/EmployeeTag riêng — pattern mirror `Comment` (objectType + objectId). 1 lần build, 5+ entity dùng.
- **task.code per-project** (`PRJ-15`) — quote-friendly, giống Linear/Jira.
- **Subtask 1 level** — vô hạn nested ít người dùng, dễ rối.
- **Status fixed**: TODO / IN_PROGRESS / REVIEW / DONE / CANCELLED. Configurable defer.
- **Calendar view**: KHÔNG build — Work là bounded context riêng, không cắm sang `/bookings`.

## ACL (BaseAcl pattern, ADR 0008)

```ts
TagAcl: canCreate/Edit/Delete = HRM admin. canList/View = same-org.
TagAssignmentAcl: canAttach/Detach delegated to target object's canEdit
  via ObjectLoaderRegistry (Task/Project/Employee/Event/Resource).

ProjectAcl:
  canView          = HRM admin | (PUBLIC && same-org) | any member
  canEdit          = HRM admin | OWNER | EDITOR
  canDelete        = HRM admin | OWNER
  canManageMembers = HRM admin | OWNER
  canArchive       = canEdit
  canTransferOwnership = HRM admin | current OWNER

TaskAcl (Phase 2):
  canView    = HRM admin | project members | task assignee/reporter/watcher
  canEdit    = HRM admin | project OWNER/EDITOR | task assignee | reporter
  canDelete  = HRM admin | project OWNER | reporter
  canComment = canView
```

Tenant isolation cứng (ADR 0001) — mọi query qua `*ByOrg` repo methods.

## UX inventory & priority

| Priority | View | Phase | Lý do |
| --- | --- | --- | --- |
| P0 | My Tasks (cross-project) | 5 | Mở app sáng là phải thấy ngay. Inbox-style. |
| P0 | Project list | 1B | Switcher giữa projects |
| P0 | Board (Kanban) | 3 | UX phổ thông nhất |
| P0 | List view (table inline-edit) | 2 | HR/PM thích table |
| P0 | Task detail drawer | 2 | Click → drawer right-side, không full-page |
| P1 | Comments + watchers + activity | 4 | Reuse F6 stack |
| P2 | Reports (per-project + workload) | 6 | Bán cho boss |
| P3 | Time tracking timer → timesheet | 7+ | **Moat** — Asana không làm tốt cái này |

## Phase plan

| Phase | Nội dung | Effort | Status |
| --- | --- | --- | --- |
| 1A | Tag generic foundation (BE + FE + admin page) | 1-1.5 ngày | ✅ done |
| 1B | Project + Member + Section CRUD + UI | 2-3 ngày | ✅ done |
| 2 | Task CRUD + List view + Detail drawer (uses TagPicker, UserPicker) | 3-4 ngày | 📋 |
| 3 | Board (Kanban) view + drag-drop (`@dnd-kit/core`) | 2-3 ngày | 📋 |
| 4 | Comments + Watchers + Activity (reuse F6) + @mention auto-watch | 1-2 ngày | 📋 |
| 5 | My Tasks cross-project view + filters | 1-2 ngày | 📋 |
| 6 | Reports — per-project (KPI + burndown + workload) + org-wide | 2 ngày | 📋 |
| 7+ | **Moat — Time tracking timer** trên task → cộng dồn `actualMinutes` per employee × period → cột mới trong Báo cáo timesheet | 2-3 ngày | defer |

**MVP demo bán hàng (Phase 1A + 1B + 2-5) ≈ 9-13 ngày**. Phase 1A + 1B đã consume 2-3 ngày bằng 2 agent song song.

## Sidebar nav

Section "Công việc" sau "Lịch":

```
Công việc
├─ Việc của tôi  (/my-tasks)        ← disabled cho đến Phase 5
└─ Dự án         (/projects)         ← Phase 1B
```

Tag library admin nằm trong `/settings/tags` — không lên sidebar (admin sub-page).

## Decisions đã chốt

| # | Decision | Default |
| --- | --- | --- |
| 1 | Project visibility default | `PRIVATE` |
| 2 | Auto-add manager khi tạo project | KHÔNG |
| 3 | Task code | per-project (`PRJ-15`), slug 3-8 in hoa |
| 4 | Subtask depth | 1 level |
| 5 | Status set | fixed v1: TODO/IN_PROGRESS/REVIEW/DONE/CANCELLED |
| 6 | Section default | "Cần làm" / "Đang làm" / "Hoàn thành" |
| 7 | Custom fields | Defer Phase 8+ |
| 8 | Calendar view | **BỎ** — Work không cắm sang `/bookings` |
| 9 | Drag library | `@dnd-kit/core` (lighter, a11y tốt hơn `react-beautiful-dnd` đã EOL) |
| 10 | Tag scope | MVP: `null` (global) cho mọi tag |
| 11 | Ai tạo Tag | HRM admin only |
| 12 | Ai gắn/gỡ Tag | Bất kỳ ai có canEdit trên object |
| 13 | Tag delete | Soft-delete + cascade ẩn assignments |
| 14 | Owner transfer | HRM admin + current owner |
| 15 | DueDate có time? | Chỉ date — time defer |
| 16 | Assignee không có User account | Không hỗ trợ — picker disable |
| 17 | Entity relation | **User** (NOT Employee) cho ownership/membership/assignment |

## Files đã tạo (Phase 1A + 1B)

### BE

```
apps/backend/src/apps/collaboration/tag/      (Phase 1A)
├─ dto/  (create, update, list, attach, bulk-set, list-assignments)
├─ tag.acl.ts
├─ tag.controller.ts                          (CRUD /tags)
├─ tag-assignment.controller.ts               (attach/detach /tag-assignments)
├─ tag.module.ts                              (wired qua CollaborationModule)
├─ tag.repository.ts
└─ tag.service.ts                             (delegation qua ObjectLoaderRegistry)

apps/backend/src/apps/work/                   (Phase 1B)
├─ project/        (acl, controller, module, repository, service, dto/)
├─ project-member/ (controller, module, repository, service, dto/)
├─ task-section/   (controller, module, repository, service, dto/)
└─ work.module.ts                             (composes 3 sub-modules)
```

`prisma/schema.prisma`: 5 model mới (Tag, TagAssignment, Project, ProjectMember, TaskSection) + inverse relations trên User.

### FE

```
apps/frontend/src/features/tags/              (Phase 1A)
├─ types · services · hooks
├─ components/  (TagBadge, TagPicker, TagLibraryAdmin)
└─ index.ts

apps/frontend/src/features/work/              (Phase 1B)
├─ types · services · hooks
├─ components/
│  ├─ project/   (ProjectCard, ProjectStatusBadge, ProjectCreateDialog,
│  │              ProjectMemberList, ProjectSettingsDrawer)
│  └─ shell/     (ProjectHeader)
├─ views/        (ProjectListView, ProjectDetailView)
└─ index.ts
```

Routes:
- `apps/frontend/src/app/(dashboard)/settings/tags/{page,view}.tsx` — RSC + client gate
- `apps/frontend/src/app/(dashboard)/projects/page.tsx` — list
- `apps/frontend/src/app/(dashboard)/projects/[slug]/page.tsx` — detail (3 tabs: List enabled placeholder, Board/Reports disabled)

Sidebar: section "Công việc".

## Defers / future

- **Custom fields** — Asana/ClickUp có. Phức tạp; defer cho khi customer yêu cầu.
- **Timeline / Gantt** — task dependency. Phase 8+.
- **Templates** — project template + recurring task. Long tail.
- **Automations** — when X then Y. Long tail.
- **Time tracking → payroll** — Phase 7+. **Moat thực sự** vs Asana/Trello: timer trên task → cộng vào timesheet → tính bonus theo project.
- **PRIVATE allow-list** — chọn user cụ thể được xem PRIVATE event/project (ngoài member). Discussed cho F7 calendar; có thể áp vào Project sau.

## Workflow check (mỗi phase)

1. Đọc ADR 0001 (tenant isolation), 0005 (folder), 0008 (BaseAcl) trước khi đụng code.
2. Schema change → `pnpm --filter @c-hr/backend prisma:migrate` (interactive, kill BE dev server trước nếu Windows).
3. After service: `pnpm --filter @c-hr/backend build` xanh.
4. After UI: `pnpm --filter @c-hr/frontend check` xanh.
5. Smoke test browser trước khi báo done.
