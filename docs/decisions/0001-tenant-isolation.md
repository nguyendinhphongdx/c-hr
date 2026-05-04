---
title: 'ADR 0001: Tenant isolation via manual repository pattern'
description: Mỗi truy vấn data của Org tự thêm filter organizationId trong repository per-service, không dùng Prisma extension auto-filter.
tags: [project, adr, decision, tenant, prisma, repository]
---

# ADR 0001: Tenant isolation via manual repository pattern

- **Status**: Accepted
- **Date**: 2026-05-03
- **Deciders**: @nguyendinhphongdx

## Context

C-HR là SaaS multi-tenant: dữ liệu của 1 Org **không được leak sang Org khác**. Mọi entity HR (Employee, Department, AttendanceLog, …) đều có `organization_id` và mọi query phía Org user phải filter theo đó.

Có 2 cách phổ biến:

1. **Prisma Client extension `$extends`** auto-inject `where: { organizationId }` vào mọi `findMany`, `findFirst`, `update`, `delete` dựa vào `organizationId` đọc từ `AsyncLocalStorage` (RequestContextService).
2. **Repository pattern thủ công**: mỗi service có 1 repository class wrap Prisma, mọi method nhận `organizationId` rõ ràng và build `where` clause tay.

## Decision

**Dùng repository pattern thủ công per-service.** Mỗi `apps/<context>/<module>/<module>.repository.ts` wrap Prisma, expose method có chữ ký rõ:

```typescript
export class EmployeeRepository {
  constructor(private prisma: PrismaService) {}

  async findManyByOrg(organizationId: string, filter: EmployeeFilter) {
    return this.prisma.employee.findMany({
      where: { organizationId, ...buildWhere(filter) },
    });
  }

  /** Bypass-tenant query — chỉ dùng cho SYS_OWNER hoặc system job. Đặt tên rõ. */
  async findByIdRaw(id: string) {
    return this.prisma.employee.findUnique({ where: { id } });
  }
}
```

Service gọi repo, không gọi `prisma.*` trực tiếp.

## Consequences

- **Positive**:
  - Có lúc cần query bypass tenant filter: SYS_OWNER xem dữ liệu Org bất kỳ, system cron tổng hợp metrics, audit log query toàn platform — repository expose method `*Raw` rõ ràng, dễ grep, dễ review.
  - Không phụ thuộc Prisma client internals (extension API có thể đổi giữa các version).
  - Repository là chỗ tự nhiên để thêm caching, batch loading sau này.
  - Test dễ — mock repo thay vì mock Prisma extension.
- **Negative**:
  - Boilerplate: mỗi entity cần 1 repository class. Mitigate qua base `BaseRepository<T>` generic.
  - Nguy cơ quên truyền `organizationId` → leak. Mitigate qua: code review checklist + test integration cho mọi endpoint kiểm tra cross-Org.
- **Neutral**:
  - `RequestContextService` (đã có sẵn từ boilerplate qua `nestjs-cls`) vẫn dùng để load `currentUser.organizationId` ở 1 chỗ trong controller, sau đó pass xuống service/repo qua argument.

## Alternatives considered

- **Option A (rejected): Prisma extension `$extends` auto-filter**
  - Ưu: viết business code không phải nghĩ về `organizationId`.
  - Nhược: bypass khó (phải cấu hình middleware tắt extension cho từng query) → các use case bypass thường xuyên (SYS_OWNER, cron, audit) trở thành friction.
- **Option B (rejected): Postgres Row-Level Security (RLS)**
  - Ưu: enforce ở DB layer, đảm bảo tuyệt đối.
  - Nhược: connection pool phải set `SET app.current_org_id` mỗi request → phức tạp với Prisma + connection pooler. Debug khó.

## Conventions kèm theo

- Repository file: `<module>.repository.ts`, class `<Module>Repository`.
- Method tên `*ByOrg(orgId, ...)` cho tenant-scoped, `*Raw(...)` cho bypass.
- Controller **luôn** lấy `organizationId` từ `currentUser` (qua `@CurrentUser()` decorator), không nhận từ body/query.
- Service nhận `organizationId` qua argument đầu, KHÔNG đọc từ ALS phía service (giữ service pure).

## References

- [docs/backend/architecture.md](../backend/architecture.md) — layered architecture
- [src/common/context/request-context.service.ts](../../apps/backend/src/common/context/request-context.service.ts) — nestjs-cls wrapper
