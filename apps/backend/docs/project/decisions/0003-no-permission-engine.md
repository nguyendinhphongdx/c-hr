---
title: 'ADR 0003: No permission engine — code if/else + AppAdmin model'
description: Không dùng RBAC decorator/permission table. Phân quyền viết if/else trong service, dựa UserType + AppAdmin record.
tags: [project, adr, decision, auth, rbac]
---

# ADR 0003: No permission engine — code if/else + `AppAdmin` model

- **Status**: Accepted
- **Date**: 2026-05-03
- **Deciders**: @nguyendinhphongdx

## Context

Phân quyền HRM cần phân biệt:
- **SYS_OWNER**: chủ vận hành SaaS, mọi quyền cross-Org.
- **AppAdmin của 1 app trong 1 Org** (vd HRM appadmin): tạo/sửa Employee, chỉnh OrgChart, gán appadmin khác.
- **ORG_USER thường**: chỉ thao tác data của bản thân + tham gia workflow approval (tạo đơn, duyệt đơn nếu được route đến).

Đã cân nhắc các giải pháp permission-based: bảng `roles + permissions + role_permissions` (DB-driven), Casbin policy engine, hybrid `SystemRole + permission_overrides`. Tất cả đều **overengineering** cho scope HRM hiện tại.

## Decision

**Không có permission engine, không có decorator `@RequirePermission`, không có bảng permission.** Phân quyền = code `if/else` trong service, dùng helper:

```typescript
// src/common/auth/access.ts
export async function isAppAdmin(
  user: User,
  app: AppCode,
  organizationId: string,
  prisma: PrismaService,
): Promise<boolean> {
  if (user.userType === 'SYS_OWNER') return true;
  if (user.userType !== 'ORG_USER') return false;
  if (user.organizationId !== organizationId) return false;
  const found = await prisma.appAdmin.findUnique({
    where: {
      userId_organizationId_appCode: {
        userId: user.id,
        organizationId,
        appCode: app,
      },
    },
  });
  return !!found;
}
```

Service thực thi check tường minh:

```typescript
async create(currentUser: User, dto: CreateEmployeeDto) {
  if (!(await isAppAdmin(currentUser, 'HRM', dto.organizationId, this.prisma))) {
    throw new ForbiddenException('Need HRM appadmin role');
  }
  return this.repo.createForOrg(dto.organizationId, dto);
}
```

### Schema

```prisma
enum UserType {
  SYS_OWNER     // chủ vận hành SaaS
  ORG_USER      // user thuộc Org
}

enum AppCode {
  HRM
  // sau: WORK, TASKS, ...
}

model AppAdmin {
  id              String   @id @default(uuid())
  userId          String
  organizationId  String
  appCode         AppCode
  grantedBy       String?  // userId
  createdAt       DateTime @default(now())

  @@unique([userId, organizationId, appCode])
  @@index([organizationId, appCode])
  @@map("app_admins")
}
```

Workflow approval (vd LeaveRequest) **không** check permission — check ownership: `if (req.approverId !== currentUser.employeeId) throw 403`.

## Consequences

- **Positive**:
  - Đọc service → thấy ngay luật: không phải chạy decorator/policy engine để hiểu.
  - Đổi quy tắc = sửa code + release. SaaS internal logic không cần Org tự config.
  - Helper `isAppAdmin` ở 1 chỗ, dễ unit test.
  - 0 boilerplate (không bảng role/permission/role_permissions).
- **Negative**:
  - Org **không tự custom role mới** (vd "HR Junior" hẹp hơn appadmin). Nếu khách yêu cầu → revisit ADR sau 1 năm.
  - Mỗi service phải nhớ check — `code-reviewer` subagent kiểm tra.
- **Neutral**:
  - `User.userType` enum chỉ 2 giá trị (SYS_OWNER, ORG_USER) — đơn giản.
  - Nếu thêm "loại user" thứ 3 (vd PARTNER, RESELLER) → mở rộng enum + helper.

## Alternatives considered

- **Option A (rejected): Permission DB-driven** (`roles` + `permissions` + `role_permissions`)
  - Quá nhiều bảng + UI quản lý cho scope HRM hiện tại.
- **Option B (rejected): Hybrid SystemRole + override**
  - 2 nguồn truth (default code + override DB) → khó audit.
- **Option C (rejected): Casbin**
  - ABAC scope vẫn phải implement manual; learning curve không xứng giá trị.

## Khi nào revisit

- Khách hàng Org yêu cầu role mới ngoài (SYS_OWNER, app admin, user thường).
- Số `if (user.userType === ... )` rải rác > 30 file → refactor sang permission constant.
- Cần ABAC kiểu "manager xem được team" mà service-level filter không đủ.

## References

- [ADR 0001](0001-tenant-isolation.md) — repository pattern hỗ trợ filter scope.
- [src/common/auth/access.ts](../../../src/common/auth/access.ts) — file sẽ tạo trong Feature 1.
