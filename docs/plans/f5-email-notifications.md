---
title: F5 — Email notifications cho Request lifecycle
description: Listener nối event emit hiện có (request.<group>.created/approved/rejected/cancelled) → MailService gửi email tới requester/approver.
tags: [plan, requests, notifications, mail]
---

# F5 — Email notifications

**Trạng thái**: 📋 chưa làm. Events đã emit trong F5 ([request.service.ts](../../apps/backend/src/apps/requests/request/request.service.ts)) nhưng chưa có listener.
**Trigger**: yêu cầu UX cơ bản — không thể trông chờ user mở app check approval.
**Blocked-by**: F5 ✅ done.

## Phạm vi

4 email template:

| Event | Recipient | Subject |
|---|---|---|
| `request.<group>.created` | Approver | "[C-HR] Đơn {{groupName}} cần duyệt — {{requesterName}}" |
| `request.<group>.approved` | Requester | "[C-HR] Đơn {{groupName}} đã được duyệt" |
| `request.<group>.rejected` | Requester | "[C-HR] Đơn {{groupName}} bị từ chối" |
| `request.<group>.cancelled` | Approver (nếu khác requester) | "[C-HR] Đơn {{groupName}} đã được huỷ" |

Email gửi tới `User.email` (qua `Employee.userId` join). Nếu employee không link User → skip + log warning.

## BE — MailService check

[apps/backend/src/libs/mail/](../../apps/backend/src/libs/mail/) — kiểm tra hiện trạng:
- Nếu chưa có → tạo `MailModule` với provider `nodemailer` (SMTP) + `handlebars` template.
- Nếu đã có → reuse, chỉ thêm template files + listener.

Env mới (nếu chưa có): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Add `.env.example` BE.

## BE — Listener module

```text
apps/backend/src/apps/requests/notifications/
├── request-mail.listener.ts          # @OnEvent('request.**.created') etc.
├── request-mail.module.ts
└── templates/
    ├── request-created.hbs
    ├── request-approved.hbs
    ├── request-rejected.hbs
    └── request-cancelled.hbs
```

```ts
@Injectable()
export class RequestMailListener {
  constructor(
    private mail: MailService,
    private userRepo: UserRepository,
    private employeeRepo: EmployeeRepository,
  ) {}

  @OnEvent('request.*.created', { async: true, promisify: true })
  async onCreated(payload: { request, group, organizationId }) {
    const approver = await this.employeeRepo.findById(payload.request.approverId);
    if (!approver?.userId) return;
    const user = await this.userRepo.findById(approver.userId);
    await this.mail.send({
      to: user.email,
      subject: `[C-HR] Đơn ${payload.group.name} cần duyệt — ${requesterDisplayName(payload.request)}`,
      template: 'request-created',
      context: { request: payload.request, group: payload.group, viewUrl: `${appUrl}/requests/${payload.request.id}` },
    });
  }
  // ... approved, rejected, cancelled
}
```

Wildcard `**.created` match cả `request.leave.created`, `request.ot.created`. Nếu listener throw → chỉ log, không break flow chính (sự kiện đã commit DB).

## BE — Wire-in

`RequestService.create/approve/reject/cancel` đã emit. Cần verify event payload đầy đủ (request entity + group + actor) — nếu thiếu, mở rộng emit.

`RequestNotificationsModule` import vào `RequestsModule`.

## FE deliverables

Không cần FE thay đổi cho MVP. (Trong-app notification panel xem [f6-3-mentions.md](f6-3-mentions.md) nhánh notifications + [roadmap.md F7.7](roadmap.md#f77).)

Sau khi gửi email, user click link `viewUrl` → mở `/requests/<id>` (deep-link đã có trong F5).

## Smoke E2E

- [ ] Setup SMTP test (Mailtrap hoặc Mailhog Docker).
- [ ] User A tạo leave request, approver = User B → User B nhận email với link.
- [ ] User B click link → load đúng request detail.
- [ ] User B approve → User A nhận email "đã được duyệt".
- [ ] User B reject → User A nhận email với decision note.
- [ ] User A cancel → User B nhận email "đã huỷ" (nếu A ≠ B).
- [ ] Self-approve (requester = approver, vd CEO) → không spam email cho chính mình (skip nếu `to === actor`).
- [ ] Approver không có User link → log warning, không crash.
- [ ] SMTP down → request vẫn save, log error, không 500.

## Done-when

- BE build xanh, MailService gửi qua SMTP test thành công.
- Smoke E2E 4 trường hợp pass.
- Template Vietnamese render đúng (typography, link button).
- Audit log không thay đổi (email là async side-effect).

## Defers

- **Real-time WS notification** trong app (badge bell icon) — xem [roadmap.md F7.7](roadmap.md#f77).
- **Email digest** (gộp N đơn pending vào 1 mail mỗi sáng) — defer.
- **User preference** opt-out per event type — defer (qua Preference module có sẵn từ F7).
- **Localization** template tiếng Anh — chỉ Vietnamese v1.
- **Mention-triggered email** (F6.3) — riêng plan [f6-3-mentions.md](f6-3-mentions.md).
- **Event reminder email** (F7.7) — không trong scope này, riêng plan.
