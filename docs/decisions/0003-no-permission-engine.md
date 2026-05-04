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
- **sysowner**: chủ vận hành SaaS, mọi quyền cross-Org.
- **admin** của Org: toàn quyền trong Org (settings, billing, gán appadmin, mọi app).
- **appadmin** của 1 app cụ thể trong 1 Org (vd HRM appadmin): tạo/sửa Employee, chỉnh OrgChart trong scope app đó.
- **user** thường: chỉ thao tác data của bản thân + tham gia workflow approval.

Hierarchy bao gồm: `sysowner ⊃ admin ⊃ appadmin (per-app) ⊃ user`. Quyền cao tự bao quyền thấp — `admin` Org tự động làm được mọi việc của appadmin các app, không cần gán thêm AppAdmin record.

Đã cân nhắc các giải pháp permission-based: bảng `roles + permissions + role_permissions` (DB-driven), Casbin policy engine, hybrid `SystemRole + permission_overrides`. Tất cả đều **overengineering** cho scope HRM hiện tại.

## Decision

**Không có permission engine, không có decorator `@RequirePermission`, không có bảng permission.** Phân quyền = code `if/else` trong service, dùng 2 helper:

```typescript
// src/common/auth/access.ts

// admin Org tổng (toàn quyền trong Org). Sysowner pass tất cả.
export function isAdmin(user: User, organizationId: string): boolean {
  if (user.role === 'sysowner') return true;
  return user.role === 'admin' && user.organizationId === organizationId;
}

// appadmin per-app. admin/sysowner pass tự động (hierarchy bao gồm).
export async function isAppAdmin(
  user: User,
  app: AppCode,
  organizationId: string,
  prisma: PrismaService,
): Promise<boolean> {
  if (isAdmin(user, organizationId)) return true;     // admin/sysowner ⊇ appadmin
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
// Tạo Employee — cần appadmin HRM (admin Org tự pass)
async create(currentUser: User, dto: CreateEmployeeDto) {
  if (!(await isAppAdmin(currentUser, 'HRM', dto.organizationId, this.prisma))) {
    throw new ForbiddenException('Need HRM appadmin or admin role');
  }
  return this.repo.createForOrg(dto.organizationId, dto);
}

// Đổi Org settings — cần admin Org (chỉ admin/sysowner)
async updateOrganization(currentUser: User, dto: UpdateOrganizationDto) {
  if (!isAdmin(currentUser, dto.organizationId)) {
    throw new ForbiddenException('Need admin role');
  }
  return this.repo.update(dto.organizationId, dto);
}
```

### Schema

```prisma
enum Role {
  sysowner    // chủ vận hành SaaS
  admin       // admin Org tổng
  user        // nhân viên thường
}

enum AppCode {
  HRM
  // sau: WORK, TASKS, ...
}

model User {
  // ...
  role            Role    @default(user)
  organizationId  String? @map("organization_id")  // null cho sysowner
  // ...
}

// Cấp quyền appadmin per-app cho user role=user. Role=admin tự bao nên không cần record.
model AppAdmin {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  organizationId  String   @map("organization_id")
  appCode         AppCode  @map("app_code")
  grantedBy       String?  @map("granted_by")
  createdAt       DateTime @default(now()) @map("created_at")

  @@unique([userId, organizationId, appCode])
  @@index([organizationId, appCode])
  @@map("app_admins")
}
```

### Hierarchy mapping

| Use case | Helper | Ai pass |
|---|---|---|
| Đổi Org timezone, currency, billing | `isAdmin(user, orgId)` | sysowner, admin |
| Gán/xóa AppAdmin record | `isAdmin(user, orgId)` | sysowner, admin |
| Tạo Employee, sửa OrgChart, cấu hình WorkSchedule | `isAppAdmin(user, 'HRM', orgId)` | sysowner, admin, appadmin HRM |
| Approve LeaveRequest do route đến | check ownership `req.approverId === user.employeeId` | bất kỳ user nào được route đến |

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
  - Hierarchy bao gồm có cons: `admin` Org luôn xem được mọi app, không tách được "admin chỉ quản trị, không xem HR". Nếu cần tách → migrate sang model song song trong tương lai (DB schema không đổi, chỉ đổi logic helper).
- **Neutral**:
  - `User.role` enum chỉ 3 giá trị (`sysowner`, `admin`, `user`) — đơn giản.
  - Nếu thêm "loại role" mới (vd `partner`, `reseller`) → mở rộng enum + helper.

## Alternatives considered

- **Option A (rejected): Permission DB-driven** (`roles` + `permissions` + `role_permissions`)
  - Quá nhiều bảng + UI quản lý cho scope HRM hiện tại.
- **Option B (rejected): Hybrid SystemRole + override**
  - 2 nguồn truth (default code + override DB) → khó audit.
- **Option C (rejected): Casbin**
  - ABAC scope vẫn phải implement manual; learning curve không xứng giá trị.

## Khi nào revisit

- Khách hàng Org yêu cầu tách `admin` và `appadmin` thành 2 layer song song (vd COO chỉ Org settings, không xem HR) → đổi `isAppAdmin` để **không** pass admin tự động.
- Khách hàng Org yêu cầu role mới ngoài 3 giá trị hiện tại → mở rộng enum + helper.
- Số `if (user.role === ... )` rải rác > 30 file → refactor sang permission constant.
- Cần ABAC kiểu "manager xem được team" mà service-level filter không đủ.

## References

- [ADR 0001](0001-tenant-isolation.md) — repository pattern hỗ trợ filter scope.
- [src/common/auth/access.ts](../../apps/backend/src/common/auth/access.ts) — file sẽ tạo trong Feature 1.
