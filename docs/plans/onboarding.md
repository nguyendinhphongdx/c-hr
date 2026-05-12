---
title: F10 — Onboarding (Template + Plan + Task lifecycle)
description: Quy trình onboarding nhân sự mới — HR khai báo template, hệ thống auto-spawn plan khi tạo Employee, task được giao + theo dõi qua F6 timeline.
tags: [project, plan, onboarding, hrm]
---

# F10 — Onboarding

> **Trạng thái**: Phase 1-4 — ✅ done (commit `5cdc2f5`). Phase 5 (polish) — ✅ done.
>
> **Vị trí**: BE bounded context `apps/backend/src/apps/onboarding/`. FE `apps/frontend/src/features/onboarding/`.
>
> **Routes**: `/onboarding` (list plans) · `/onboarding/[planId]` (HR/manager view) · `/my-onboarding` (self-service, new hire) · `/settings/onboarding-templates` (admin).

## Vì sao cần

C-HR đã có Employee + Department + Attendance + Work + Payroll. Lỗ hổng cuối cùng trong "vòng đời nhân sự": **ngày đầu đi làm**. Hiện tại HR phải nhớ thủ công 10-15 đầu việc (cấp tài khoản, ký HĐ, làm BHXH, brief, …) mỗi lần có người mới — không có audit, dễ sót, không nhìn được tiến độ.

Khoảng trống thị trường:

- Workday / BambooHR có module Onboarding mạnh nhưng international + đắt.
- Base.vn HRM / Misa AMIS HR: VN-localized nhưng onboarding chỉ là checklist tĩnh, không gắn với Employee lifecycle.
- C-HR Onboarding: **template → auto-spawn khi tạo Employee → task có assignee + due date + audit qua F6 timeline** — closed loop với HRM core.

## Domain model

Schema: `apps/backend/prisma/schema.prisma`. Tóm tắt:

| Model | Vai trò |
| --- | --- |
| `OnboardingTemplate` | Mẫu quy trình org-scoped. `isDefault` flag — 1 default/org auto-apply khi tạo Employee không chỉ định template. Soft-delete (`deletedAt`). |
| `OnboardingTemplateTask` | Item trong template. `order` (int step 1000), `defaultAssigneeRole` (HR / MANAGER / IT / NEW_HIRE / CUSTOM), `defaultAssigneeUserId` (chỉ khi role=CUSTOM), `dueOffsetDays` (relative tới startedAt). |
| `OnboardingPlan` | Instance của template per-Employee. `templateNameSnapshot` (lưu tên template lúc spawn — không phụ thuộc template về sau). `status` PENDING → IN_PROGRESS → COMPLETED / ARCHIVED. `startedAt`, `completedAt`. |
| `OnboardingTask` | Item trong plan. `assigneeId` (resolved từ role lúc spawn), `dueDate` (= startedAt + offsetDays), `status` TODO / DONE, `completedAt`, `completedNote`. Tag-able + comment-able qua F6. |

**Quyết định kiến trúc cứng**:

- **Snapshot tên template** — plan giữ `templateNameSnapshot` nên admin sửa/xoá template không phá plan đang chạy.
- **AssigneeRole resolver** lúc spawn — không lưu role string trong plan task; resolve thành userId 1 lần, lock vào assignee field. Đổi manager sau đó không re-assign tự động.
- **Auto-spawn từ Employee.create** qua `EmployeeLifecycleListener` (event-based, fire-and-forget) — không block Employee creation nếu template/listener lỗi.
- **Status fixed** — TODO/DONE thay vì status workflow phức tạp. Plan-level status (PENDING/IN_PROGRESS/COMPLETED/ARCHIVED) derive từ task aggregate + manual archive.

## ACL (BaseAcl pattern, ADR 0008)

```text
OnboardingTemplateAcl:
  canCreate/Edit/Delete = HRM admin
  canList/View          = HRM admin

OnboardingPlanAcl:
  canView    = HRM admin | manager của employee | employee chính chủ
  canEdit    = HRM admin (archive, add task)
  canArchive = HRM admin
  canDelete  = HRM admin (chỉ ARCHIVED + không có task DONE)

OnboardingTaskAcl:
  canView     = canView plan
  canEdit     = HRM admin | assignee
  canComplete = HRM admin | assignee
  canReassign = HRM admin | manager
  canDelete   = HRM admin (plan chưa COMPLETED)
```

Tenant isolation cứng (ADR 0001) — mọi query qua `*ByOrg` repo methods.

## UX inventory

| Route | View | Persona | Mục đích |
| --- | --- | --- | --- |
| `/settings/onboarding-templates` | TemplateLibraryView | HRM admin | CRUD template, gắn default, reorder task |
| `/onboarding` | OnboardingListView | HRM admin / manager | List plan đang chạy, filter status/employee |
| `/onboarding/[planId]` | OnboardingDetailView | HRM admin / manager | 1 plan: header + list task + add task + complete/reassign |
| `/my-onboarding` | MyOnboardingView | New hire | Self-service — "Việc cần bạn làm" + "Đang theo dõi" |
| `/` (Home OnboardingCard) | OnboardingCard widget | New hire | Surfaces progress, 30-day celebration variant sau khi hoàn thành |

## Phase plan

| Phase | Nội dung | Effort | Status |
| --- | --- | --- | --- |
| 1 | Template CRUD (BE+FE) + admin page `/settings/onboarding-templates` | 1-1.5 ngày | ✅ done |
| 2 | Plan + Task service + auto-spawn listener khi Employee.create + activity emit | 2 ngày | ✅ done |
| 3 | `/onboarding` list + detail view + add/complete/reassign task | 1.5 ngày | ✅ done |
| 4 | `/my-onboarding` self-service + dashboard `OnboardingCard` widget | 1 ngày | ✅ done |
| 5 | Polish: VN activity labels, `?taskId=` deep-link, template softDelete guard, 30-day celebration card, plan doc | 1 ngày | ✅ done |

## Decisions đã chốt

| # | Decision | Default |
| --- | --- | --- |
| 1 | Auto-spawn khi nào? | Khi `Employee.create` thành công, fire-and-forget listener |
| 2 | Template default | 1 org có tối đa 1 `isDefault=true` template |
| 3 | Xoá template còn plan? | Reject — `BadRequestException` nếu còn plan status ≠ ARCHIVED |
| 4 | Sửa template ảnh hưởng plan? | KHÔNG — plan snapshot tại spawn time |
| 5 | Subtask? | KHÔNG — flat list, dùng order |
| 6 | Plan status auto-transition | PENDING → IN_PROGRESS khi 1 task DONE; → COMPLETED khi tất cả DONE |
| 7 | Re-open completed plan? | Uncomplete bất kỳ task → plan rớt về IN_PROGRESS |
| 8 | Deep-link drawer | `?taskId=<id>` mirror F8 `?taskCode=` pattern |
| 9 | Celebration window | 30 ngày sau `completedAt`, sau đó card ẩn |

## Cross-reference

- ADR 0001 — Tenant isolation
- ADR 0005 — Bounded contexts (`apps/backend/src/apps/onboarding/`)
- ADR 0008 — BaseAcl pattern (3 ACL: Template, Plan, Task)
- F6 Collaboration — Comment + Activity reuse cho `OnboardingTask` (`encodeObjectRef({ objectType: "OnboardingTask", objectId })`)
- F8 Work — precedent cho `?taskCode=` deep-link, copy pattern sang `?taskId=`

## Files đã tạo

### BE — `apps/backend/src/apps/onboarding/`

```text
template/
├─ dto/  (create-template, update-template, list-templates, create-template-task, update-template-task, reorder-template-tasks)
├─ onboarding-template.acl.ts
├─ onboarding-template.controller.ts
├─ onboarding-template.module.ts
├─ onboarding-template.repository.ts
└─ onboarding-template.service.ts                  (softDelete guard chặn khi còn active plan)

plan/
├─ dto/  (create-plan, add-task, list-plans)
├─ onboarding-plan.acl.ts
├─ onboarding-plan.controller.ts
├─ onboarding-plan.module.ts
├─ onboarding-plan.repository.ts
└─ onboarding-plan.service.ts                      (emit onboarding.plan_created / _archived / _completed)

task/
├─ dto/  (complete-task, reassign-task, update-task)
├─ onboarding-task.acl.ts
├─ onboarding-task.controller.ts
├─ onboarding-task.module.ts
├─ onboarding-task.repository.ts
└─ onboarding-task.service.ts                      (emit onboarding.task_completed / _reassigned)

lifecycle/
├─ assignee-resolver.ts                            (role → userId lúc spawn)
└─ employee-lifecycle.listener.ts                  (Employee.created → spawn plan từ default template)

onboarding.module.ts                                (composes 3 sub-modules + lifecycle)
```

`prisma/schema.prisma`: 4 model mới (`OnboardingTemplate`, `OnboardingTemplateTask`, `OnboardingPlan`, `OnboardingTask`) + enum `AssigneeRole`, `OnboardingPlanStatus`. Inverse relations trên `Employee.onboardingPlans` + `User.onboardingTasksAssigned` + `OnboardingTemplate.plans`. Migration: `f10_onboarding`.

### FE — `apps/frontend/src/features/onboarding/`

```text
types · services · hooks (useOnboardingTemplates, useOnboardingPlans, useOnboardingTasks)
components/
├─ template/  (TemplateCard, TemplateCreateDialog, TemplateEditDialog, TemplateTaskRow)
├─ plan/      (PlanCard, PlanCreateDialog, PlanHeader, PlanProgressBar, PlanStatusBadge)
└─ task/      (TaskAddDialog, TaskChecklistRow, TaskCompleteDialog, TaskDetailDrawer,
                TaskReassignDialog, TaskWatchRow)
views/        (OnboardingListView, OnboardingDetailView, MyOnboardingView)
index.ts
```

Routes:

- `apps/frontend/src/app/(dashboard)/settings/onboarding-templates/page.tsx`
- `apps/frontend/src/app/(dashboard)/onboarding/page.tsx`
- `apps/frontend/src/app/(dashboard)/onboarding/[planId]/page.tsx`
- `apps/frontend/src/app/(dashboard)/my-onboarding/page.tsx`

Cross-cut:

- `apps/frontend/src/features/dashboard/components/OnboardingCard.tsx` — home widget với 2 variant (active progress / 30-day celebration).
- `apps/frontend/src/features/collaboration/components/ActivityTimeline.tsx` — 5 action label VN cho `onboarding.*`.

## Phase 5 polish — chi tiết

1. **VN activity labels** ở `ActivityTimeline.tsx`: 5 action key (`plan_created`, `plan_archived`, `plan_completed`, `task_completed`, `task_reassigned`) cùng icon + màu emerald/sky/indigo theo semantic. Dùng chung với F6 `UnifiedTimeline` qua `metaFor()`.
2. **`?taskId=` deep-link** ở `OnboardingDetailView` + `MyOnboardingView`: read once trên mount qua `useSearchParams()` initializer, sync open/close qua `router.replace(${pathname}?${qs})`. Mirror chính xác F8 `ProjectDetailView` `?taskCode=`.
3. **Template softDelete guard** ở `onboarding-template.service.ts`: count `OnboardingPlan` `status != ARCHIVED` theo `templateId`; nếu >0 throw `BadRequestException` với message `Không xoá được mẫu — còn N quy trình đang hoạt động.`.
4. **30-day celebration card** ở `OnboardingCard.tsx`: dùng `differenceInDays(new Date(), parseISO(plan.completedAt)) <= 30`. Variant emerald với `🎉 Chúc mừng! Bạn đã hoàn thành onboarding` + ngày hoàn thành + link "Xem lại" → `/my-onboarding`.
5. **Plan doc**: file này.

## Defers / future

- **Multi-template per Employee** — hiện 1 employee = 1 active plan. Phase 6+ nếu cần (vd intern → fulltime).
- **Email reminder** — task quá hạn không có email notify. Wait F5-email-notifications.
- **Slack/Teams handoff** — task ping qua chat. Long tail.
- **Offboarding** — gương F10 nhưng cho người nghỉ việc. Domain khác (return device, exit interview, …). Plan riêng khi customer yêu cầu.
- **Custom task template variables** — vd inject `{{employee.name}}` vào title. Phase 6+.
- **Bulk re-spawn** — đổi template default rồi muốn re-apply cho plan đang chạy. Domain phức tạp, defer.

## Workflow check (mỗi phase)

1. Đọc ADR 0001 (tenant isolation), 0005 (folder), 0008 (BaseAcl) trước khi đụng code.
2. Schema change → `pnpm --filter @c-hr/backend prisma:migrate` (interactive, kill BE dev server trước nếu Windows).
3. After service: `pnpm --filter @c-hr/backend build` xanh.
4. After UI: `pnpm --filter @c-hr/frontend check` xanh.
5. Smoke test browser trước khi báo done.
