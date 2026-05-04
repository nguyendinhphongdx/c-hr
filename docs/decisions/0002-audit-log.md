---
title: 'ADR 0002: Audit log via @Auditable interceptor'
description: Cấu trúc audit_logs, scope các action cần ghi, retention.
tags: [project, adr, decision, audit, security]
---

# ADR 0002: Audit log via `@Auditable` interceptor

- **Status**: Accepted
- **Date**: 2026-05-03
- **Deciders**: @nguyendinhphongdx

## Context

HRM xử lý dữ liệu nhạy cảm: lương (sau), nghỉ phép, chấm công, gán/xóa appadmin, đổi orgchart. Khi có tranh chấp ("ai duyệt đơn này", "ai đổi lương tôi"), phải truy vết được.

## Decision

Bảng `audit_logs` chung, ghi qua interceptor `@Auditable()` (opt-in trên controller method).

```prisma
model AuditLog {
  id              String   @id @default(uuid())
  organizationId  String?       // nullable cho action cấp platform (SYS_OWNER)
  actorUserId     String?       // ai thực hiện action
  actorIpAddress  String?
  actorUserAgent  String?
  action          String        // "EMPLOYEE_CREATE", "LEAVE_APPROVE", "APP_ADMIN_GRANT", ...
  entityType      String        // "Employee", "LeaveRequest", "AppAdmin"
  entityId        String?
  diff            Json?         // { before: {...}, after: {...} } — tuỳ action
  metadata        Json?         // payload bổ sung (request body, decision reason)
  createdAt       DateTime @default(now())

  @@index([organizationId, entityType, entityId])
  @@index([actorUserId, createdAt])
  @@index([createdAt])
  @@map("audit_logs")
}
```

Decorator + interceptor:

```typescript
@Post(':id/approve')
@Auditable({ action: 'LEAVE_APPROVE', entity: 'LeaveRequest' })
async approve(@Param('id') id: string, @CurrentUser() user: User) {
  return this.svc.approve(user, id);
}
```

Interceptor (`AuditInterceptor` global):
- Trước handler: snapshot `before` (gọi service `findById` nếu là UPDATE/DELETE).
- Sau handler success: snapshot `after`, build diff, write `audit_logs` (async qua queue / EventEmitter, không block response).
- Lỗi → không ghi (chỉ ghi action thành công).

## Scope — actions phải audit

Bắt buộc:
- **Org structure**: tạo/sửa/xóa Department, đổi `Department.managerId`, đổi `Employee.departmentId`, đổi `Employee.title`.
- **Permission**: gán/xóa AppAdmin, đổi `User.userType`.
- **Approval workflow**: tạo/approve/reject/cancel LeaveRequest, AttendanceCorrection.
- **Attendance**: HR sửa thủ công AttendanceLog (device push không cần audit từng log).

Không audit:
- Read-only query (GET).
- User self-update profile (`User.title`, `User.name`) — không nhạy cảm.
- Login (đã có riêng cơ chế nếu cần, ngoài scope ADR này).

## Retention

- Default: giữ 2 năm.
- Cron job `audit-cleanup` chạy hằng tháng xóa record `created_at < now - 2 years`.
- Per-Org configurable sau (TBD).

## Consequences

- **Positive**:
  - 1 chỗ tra cứu cho mọi audit-relevant action.
  - Decorator pattern keep service clean.
  - Async write không impact latency.
- **Negative**:
  - Cần queue / event emitter để write async — dùng `@nestjs/event-emitter` (đã có) ở MVP, BullMQ sau khi traffic tăng.
  - `diff` có thể chứa data nhạy cảm (lương) — cần redact field cụ thể trước khi ghi.
- **Neutral**:
  - Bảng `audit_logs` có thể tăng nhanh → cần retention.

## Alternatives considered

- **Option A (rejected): trigger DB level**
  - Ưu: không miss action nào, kể cả khi bypass app code.
  - Nhược: khó capture user context (phải set session var mỗi connection); migration rườm rà.
- **Option B (rejected): event sourcing toàn bộ**
  - Quá phức tạp cho HRM scope.

## References

- [src/common/interceptors/](../../apps/backend/src/common/interceptors/) — pattern interceptor sẵn có
