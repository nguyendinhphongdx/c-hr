---
title: F6.3 — Mention picker @user + notifications
description: Tiptap mention extension + user search endpoint + notification khi được mention. V1 chỉ in-app (toast); email mention defer.
tags: [plan, collaboration, mentions, notifications]
---

# F6.3 — Mention picker + notifications

**Trạng thái**: 📋 chưa làm. F6 hiện store `mentions: [{userId, name}]` snapshot từ FE nhưng không có picker UI hay notification.
**Trigger**: user comment muốn ping cụ thể đồng nghiệp.
**Blocked-by**: F6 ✅ done.

## BE deliverables

### Endpoint user search

```text
GET /users/search?q=&inOrg=true&limit=10
```

- Filter: `User.name ILIKE %q% OR Employee.firstName/lastName ILIKE %q% OR User.email ILIKE %q%`.
- Tenant: chỉ user cùng `organizationId` (default `inOrg=true`).
- Response: `[{ userId, name, avatar, employeeId, title }]`.
- Index: `User(organizationId, name)` đã có; nếu chậm thêm `pg_trgm` ext.

### Notification trigger

`CommentService.create` đã emit activity `<object>.commented`. Mở rộng:

```ts
async create(input) {
  const comment = await this.repo.create(input);
  this.activities.log({ ...activity });

  // Mới — emit per-mention
  for (const m of input.mentions ?? []) {
    this.events.emit('comment.mentioned', {
      mentionedUserId: m.userId,
      commentId: comment.id,
      objectType: input.objectType,
      objectId: input.objectId,
      actorUserId: input.userId,
      preview: htmlToText(input.bodyHtml).slice(0, 200),
    });
  }
  return comment;
}
```

### Notification entity (bảng mới)

```prisma
enum NotificationType { MENTION REQUEST_PENDING REQUEST_DECIDED EVENT_INVITE }

model Notification {
  id             String           @id @default(uuid())
  organizationId String           @map("organization_id")
  userId         String           @map("user_id")           // recipient
  type           NotificationType
  /// "Tuấn đã nhắc bạn trong đơn nghỉ phép" — pre-rendered string
  title          String
  /// preview comment body / decision note
  body           String?          @db.Text
  /// Deep-link FE: "/requests/abc#comment-xyz"
  url            String?
  /// Liên quan tới object nào (poly)
  objectType     String?          @map("object_type")
  objectId       String?          @map("object_id")
  readAt         DateTime?        @map("read_at")
  createdAt      DateTime         @default(now()) @map("created_at")
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, readAt, createdAt(sort: Desc)])
  @@map("notifications")
}
```

Migration: `add_notifications`.

### Notification listener

```ts
@OnEvent('comment.mentioned', { async: true })
async onMentioned(payload) {
  await this.notifRepo.create({
    organizationId: ...,
    userId: payload.mentionedUserId,
    type: 'MENTION',
    title: `${actorName} nhắc bạn trong ${objectLabel}`,
    body: payload.preview,
    url: `/${routeFor(payload.objectType)}/${payload.objectId}#comment-${payload.commentId}`,
    objectType: payload.objectType,
    objectId: payload.objectId,
  });
}
```

### Endpoint Notification

```text
GET    /notifications?unreadOnly=true&limit=20    — list của tôi
PATCH  /notifications/:id/read                    — mark read
PATCH  /notifications/read-all                    — mark all read
GET    /notifications/unread-count                — for badge
```

## FE deliverables

### Tiptap mention extension

```ts
// CommentEditor.tsx
import Mention from '@tiptap/extension-mention';

const editor = useEditor({
  extensions: [
    StarterKit, Link, Underline,
    Mention.configure({
      HTMLAttributes: { class: 'mention-pill' },
      suggestion: {
        items: ({ query }) => fetchUserSearch(query),
        render: () => mentionDropdownRenderer,    // tippy.js popup
      },
    }),
  ],
  // ...
});
```

`tippy.js` cho dropdown popup. `fetchUserSearch` debounce 200ms.

Khi user pick → tiptap insert `<span data-mention-user-id="xxx" data-mention-name="Tuấn">@Tuấn</span>`.

`onSubmit`: extract mentions từ HTML qua DOMParser → `mentions: [{userId, name}]` đính kèm input.

### Notification UI

- `components/notifications/NotificationBell.tsx`:
  - Bell icon trong header với badge unread count.
  - Click mở popover list 20 notif gần nhất.
  - Click 1 notif → navigate `url` + mark read.
  - Button "Đọc tất cả".
- `useNotifications.ts` polling 60s + `useUnreadCount.ts`.

## Smoke E2E

- [ ] `GET /users/search?q=tu` → trả user có "Tuấn".
- [ ] User A comment `<span data-mention-user-id="B">@B</span> xem giúp` → mentions stored, notification row tạo cho B.
- [ ] B login → bell badge = 1, popover hiện "A nhắc bạn trong Đơn ABC".
- [ ] Click → mở `/requests/abc#comment-xyz`, badge → 0.
- [ ] Mention chính mình → không tạo notification (skip self).
- [ ] Mention user Org B → search không trả → FE không cho pick → BE validate `userId ∈ same org` (defense-in-depth).

## Done-when

- BE build + migration applied.
- FE Tiptap dropdown autocomplete chạy mượt < 300ms.
- B nhận notification real-time (next poll cycle ≤ 60s).
- Mention persistence: comment edit giữ mention, FE re-render đúng.

## Defers

- **Email mention** — defer cho khi có MailService listener ([f5-email-notifications.md](f5-email-notifications.md) làm trước, mở rộng sang mention sau).
- **Real-time WS** thay polling — [roadmap.md F7.7](roadmap.md#f77).
- **Group mention** (`@hr`, `@managers`) — defer.
- **Mention trong DynamicForm description / Request title** — chỉ comment v1.
