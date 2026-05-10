---
title: F7.5 — Tasks ("Việc cần làm") tab trên calendar
description: Tab thứ 2 trên header calendar bên cạnh "Sự kiện". Tạo Task entity riêng (không reuse Request) vì lifecycle khác.
tags: [plan, calendar, tasks, post-mvp]
---

# F7.5 — Tasks tab

**Trạng thái**: 📋 chưa làm. Tab "Việc cần làm" có trong screenshot F7 nhưng defer khi build MVP.
**Decision**: tạo `Task` entity riêng (KHÔNG reuse Request engine — lifecycle TODO/IN_PROGRESS/DONE không match PENDING/APPROVED/REJECTED, không cần approver).
**Blocked-by**: F7 ✅ done.

## Schema

```prisma
enum TaskStatus { TODO IN_PROGRESS DONE CANCELLED }
enum TaskPriority { LOW NORMAL HIGH URGENT }

model Task {
  id             String       @id @default(uuid())
  organizationId String       @map("organization_id")
  ownerId        String       @map("owner_id")          // Employee tạo
  assigneeId     String?      @map("assignee_id")       // Employee được giao (null = chưa giao)

  title          String
  description    String?      @db.Text
  status         TaskStatus   @default(TODO)
  priority       TaskPriority @default(NORMAL)

  dueDate        DateTime?    @map("due_date")
  startDate      DateTime?    @map("start_date")
  completedAt    DateTime?    @map("completed_at")

  /// Liên kết tới Event nếu task thuộc 1 cuộc họp (vd "Chuẩn bị slide cho meeting Friday")
  eventId        String?      @map("event_id")
  event          Event?       @relation(fields: [eventId], references: [id], onDelete: SetNull)

  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt      @map("updated_at")
  deletedAt      DateTime?    @map("deleted_at")

  owner          Employee     @relation("TaskOwner", fields: [ownerId], references: [id])
  assignee       Employee?    @relation("TaskAssignee", fields: [assigneeId], references: [id])

  @@index([organizationId, assigneeId, status, dueDate])
  @@index([organizationId, ownerId, status])
  @@index([eventId])
  @@map("tasks")
}
```

Migration: `add_tasks`.

Relation ngược ở `Employee`:
```prisma
ownedTasks    Task[] @relation("TaskOwner")
assignedTasks Task[] @relation("TaskAssignee")
```

## BE — Module

```text
apps/backend/src/apps/calendar/task/
├── task.module.ts
├── task.controller.ts
├── task.service.ts
├── task.repository.ts
├── task.acl.ts          # owner + assignee + HRM appadmin
└── dto/
```

Endpoints:

```text
GET    /tasks?assigneeId=&status=&dueBefore=&dueAfter=
GET    /tasks/:id
POST   /tasks
PATCH  /tasks/:id
PATCH  /tasks/:id/status   { status }     — quick action
DELETE /tasks/:id
```

ACL:
- View: owner | assignee | HRM appadmin.
- Edit: owner | assignee (status only) | HRM appadmin.
- Delete (soft): owner | HRM appadmin.

Wire-in F6: comment + activity. `objectType: 'Task'`. Actions: `task.created/assigned/status_changed/commented/cancelled`.

## FE deliverables

```text
apps/frontend/src/features/tasks/
├── components/
│   ├── TaskCard.tsx               # 1 task chip (title + due + assignee avatar + status badge)
│   ├── TaskBoard.tsx              # kanban 4 col TODO/IN_PROGRESS/DONE/CANCELLED, dnd-kit
│   ├── TaskList.tsx               # list view với grouping (Hôm nay / Tuần này / Sau)
│   ├── TaskCreateDialog.tsx
│   └── TaskDetailDialog.tsx       # full edit + comments + activity
├── hooks/
│   ├── useTasks.ts
│   └── useUpdateTaskStatus.ts
├── services/
│   └── taskService.ts
└── views/
    └── TasksView.tsx              # /bookings?tab=tasks — toggle list/board view
```

CalendarTabs (`apps/frontend/src/features/calendar/components/shell/CalendarTabs.tsx`) thêm tab thứ 3 "Việc cần làm" → `<TasksView />`.

Sidebar mini-task widget trong calendar:
- Section "Việc của tôi (5)" trên `CalendarSidebar.tsx` — list 5 task gần due nhất, click → mở detail.

Tasks linked với Event hiện trên `EventDetailDialog.tsx` section "Việc liên quan" (qua `useTasks({ eventId })`).

## Smoke E2E

- [ ] `POST /tasks { title, assigneeId: B, dueDate }` → 201, activity `task.created` + `task.assigned`.
- [ ] B `GET /tasks?assigneeId=me&status=TODO` → trả task.
- [ ] B `PATCH /tasks/:id/status { status: 'DONE' }` → activity `task.status_changed`, `completedAt = now`.
- [ ] Non-owner non-assignee non-HR → 403.
- [ ] Tạo Task linked với Event → `EventDetailDialog` show task trong section.
- [ ] Drag task TODO → IN_PROGRESS trên kanban → PATCH thành công, optimistic UI.

## Done-when

- BE build xanh, migration applied.
- FE check xanh, tab "Việc cần làm" trong `/bookings` render kanban + list toggle.
- Comment + activity wire-in (qua F6.5 pattern).

## Defers

- **Recurring tasks** — defer (rrule reuse từ Event recurrence sau).
- **Subtasks** (parent-child) — defer.
- **Task templates** — defer.
- **Time tracking** (estimated vs actual hours) — defer.
- **Project / epic grouping** — defer (cần "WORK app" entity Project trước, [roadmap §WORK app](roadmap.md#work-app)).
- **Notification due-soon** — wire vào notification system của F6.3.
