---
title: F6.5 — Comment rollout sang Event / Employee / Department
description: Mở rộng comment endpoint pilot Request sang 3 object khác. Pattern lặp — copy controller method + ACL inline.
tags: [plan, collaboration, rollout]
---

# F6.5 — Comment rollout

**Trạng thái**: 📋 partial. Event đã có **Activity** wire-in (5 chỗ trong [event.service.ts](../../apps/backend/src/apps/calendar/event/event.service.ts)) nhưng **chưa có Comment endpoint**. Employee/Department chưa có cả 2.
**Trigger**: user note hồ sơ HR, manager note phòng ban, comment trên event.
**Blocked-by**: F6 ✅ done.

## Pattern (copy từ Request)

Mỗi object cần 3 endpoint:

```text
GET  /<object>/:id/comments           — list (group theo parentId)
POST /<object>/:id/comments           — create + auto activity
GET  /<object>/:id/activities         — timeline
```

Mỗi controller method:
1. Load object qua repo (existing).
2. Check ACL (object-specific — reuse `BaseAcl` từ F6.2 nếu đã có ACL view).
3. Delegate `CommentService.listFor / create` hoặc `ActivityService.listFor`.

`CommentService` đã auto-emit `<objectType.toLowerCase()>.commented` activity.

## Per-object detail

### Event (calendar)

- File: [event.controller.ts](../../apps/backend/src/apps/calendar/event/event.controller.ts).
- Đã có `event.acl.ts` ✅ (BaseAcl) — reuse `assertCanView` cho GET, `assertCanComment` cho POST (mới — default = canView).
- ACL: requester (owner) + attendees + HRM appadmin. Visibility `PRIVATE` exclude non-attendee.
- Activity actions: `event.commented` (auto), đã có `event.created/updated/cancelled`.

### Employee (hrm)

- File: [employee.controller.ts](../../apps/backend/src/apps/hrm/employee/employee.controller.ts).
- ACL inline (employee.acl.ts ✅ có): chỉ HRM appadmin + chính employee đó (qua User.employeeId match) thấy. Comment internal cho HR note → đặt mặc định `isInternal: true` cho object này (employee không thấy comment HR ghi về mình trừ khi HR explicit `isInternal: false`).
- Activity actions: `employee.created/updated/terminated/note_added`.

### Department (hrm)

- File: [department.controller.ts](../../apps/backend/src/apps/hrm/department/department.controller.ts).
- ACL: manager phòng ban + HRM appadmin. Members thấy comment public (`isInternal: false`).
- Activity actions: `department.commented`, đã có `department.created/updated/manager_changed`.

## FE deliverables

`features/collaboration/components/UnifiedTimeline.tsx` đã generic theo `objectType + objectId`. Mỗi object cần:

- Section trong detail view → render `<UnifiedTimeline objectType="Event" objectId={event.id} />`.
- `<CommentEditor onSubmit={...} />` ở cuối panel.

Cụ thể:

| Object | View | Vị trí |
|---|---|---|
| Event | `EventDetailDialog.tsx` | Tab "Bình luận" mới |
| Employee | `EmployeeDetailView.tsx` | Tab "HR Note" mới |
| Department | `DepartmentDetailView.tsx` (cần tạo nếu chưa có) | Section dưới member list |

Action icon mapping trong `ActivityTimeline.tsx`:
- `event.commented` → 💬, `event.attendee_responded` → 📋
- `employee.note_added` → 📝, `employee.title_changed` → 🏷️
- `department.manager_changed` → 👤, `department.member_added` → ➕

## Smoke E2E

- [ ] `POST /events/:id/comments` → 201, activity `event.commented` log.
- [ ] `GET /events/:id/comments` → trả comment.
- [ ] Non-attendee user → `GET /events/:id/comments` 403.
- [ ] HR `POST /employees/:id/comments { isInternal: true }` → comment lưu, employee không thấy ở UI (BE filter `isInternal=true` cho non-HR).
- [ ] Manager `POST /departments/:id/comments` → members trong dept thấy public comment.
- [ ] Cross-Org: User Org A `GET /events/<orgB-event>/comments` → 404.

## Done-when

- 9 endpoint mới (3 per object × 3 object) — BE build xanh.
- 3 view UI (Event/Employee/Department) render timeline + editor.
- Audit + activity log entries đúng action name.

## Defers

- **Project / Performance review / Document** — chưa có entity, defer.
- **Comment count badge** trên list view (vd Department list show "5 comments") — `CommentService.countFor` đã có, FE chưa wire. ~½ ngày polish.
- **Cross-object @mention** (vd mention employee trong department comment) — F6.3 mention picker là per-comment local, không cross-link object. Defer.
