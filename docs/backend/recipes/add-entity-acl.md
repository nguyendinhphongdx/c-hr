---
title: Add an entity ACL
description: Step-by-step recipe for adding object-level permissions (canView / canEdit / canDelete + custom flags) to a NestJS feature module. Implements ADR 0008.
tags: [recipe, acl, authorization, security]
---

# Add an entity ACL

For row-level "can the current user view / edit / delete this object?" decisions. Action-level checks ("can the user call this endpoint at all") still go through `requireAppAdmin` from [`common/auth/access.ts`](../../../apps/backend/src/common/auth/access.ts).

See [ADR 0008](../../decisions/0008-entity-acl-pattern.md) for rationale.

## When you need this

- Any service method that operates on a single row and a non-admin user might be allowed *for some rows but not others* (own row, dept manager, etc.).
- Detail endpoints (`findOne`) where the FE needs to hide edit/delete buttons based on rules.

## When you don't

- Pure tenant filtering — already enforced by `*ByOrg` repo methods ([ADR 0001](../../decisions/0001-tenant-isolation.md)).
- Endpoints where role alone decides (e.g. only HRM appadmin can ever call `create`). Use `this.ctx.requireAppAdmin('HRM', orgId)` directly.

## 1. Create `<feature>.acl.ts`

```ts
// apps/backend/src/apps/hrm/employee/employee.acl.ts
import { Employee } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/** Subset of fields the ACL reads — lets callers build an ACL from a
 *  partial object (e.g. {id, organizationId}) without fetching the row. */
export type EmployeeAclSubject = Pick<Employee, 'id' | 'organizationId'>;

export interface EmployeeAclView extends AclView {
  canViewLogs: boolean;
}

export class EmployeeAcl extends BaseAcl<EmployeeAclSubject, EmployeeAclView> {
  canView(): boolean {
    return this.ctx.organizationId === this.obj.organizationId;
  }

  canEdit(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  canDelete(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  canViewLogs(): boolean {
    return this.ctx.employeeId === this.obj.id || this.canEdit();
  }

  async getAcl(): Promise<EmployeeAclView> {
    const base = await super.getAcl();
    return { ...base, canViewLogs: this.canViewLogs() };
  }
}
```

## 2. Use it in the service

```ts
// findOne — attach view so FE can hide buttons.
async findOne(id: string) {
  const orgId = this.ctx.requireOrg();
  const employee = await this.repo.findByIdByOrg(orgId, id);
  if (!employee) throw new NotFoundException('Employee not found');
  const acl = new EmployeeAcl(employee);
  await acl.require('canView');
  return { ...employee, view: await acl.getAcl() };
}

// update / softDelete — gate on the row.
async update(id: string, dto: UpdateEmployeeDto) {
  const orgId = this.ctx.requireOrg();
  const existing = await this.repo.findByIdByOrg(orgId, id);
  if (!existing) throw new NotFoundException('Employee not found');
  await new EmployeeAcl(existing).require('canEdit');
  // ...rest of update logic
}
```

For methods that take `employeeId` from a query (e.g. timesheet), build the ACL from the minimal shape — no extra fetch:

```ts
const acl = new EmployeeAcl({ id: query.employeeId, organizationId: orgId });
if (!acl.canViewLogs()) throw new ForbiddenException('...');
```

## 3. Don'ts

- **Don't** inject `PrismaService` into the ACL. If a predicate needs DB data, either bake it into ctx at auth time (preferred — see `appAdminCodes`) or let the service pre-load and pass it via the constructor object.
- **Don't** thread `ctx` through ACL methods — `BaseAcl` reads it via the static accessor.
- **Don't** mix entities in one ACL. One file = one entity.
- **Don't** put `create` permissions on the ACL — there's no object yet. Use `this.ctx.requireAppAdmin(...)` at the top of the create method.
- **Don't** spread the `view` block over root entity properties to "save bytes" — frontends rely on the namespaced `view: { ... }` shape so it survives schema changes.

## 4. Custom flags pattern

For per-entity permissions beyond the trio:

```ts
interface RequestAclView extends AclView {
  canApprove: boolean;
  canCancel: boolean;
}

class RequestAcl extends BaseAcl<RequestRow, RequestAclView> {
  canApprove(): boolean {
    return this.obj.approverEmployeeId === this.ctx.employeeId
        && this.obj.status === 'PENDING';
  }
  canCancel(): boolean {
    return this.obj.requesterEmployeeId === this.ctx.employeeId
        && this.obj.status === 'PENDING';
  }
  async getAcl() {
    const base = await super.getAcl();
    return { ...base, canApprove: this.canApprove(), canCancel: this.canCancel() };
  }
  // canView / canEdit / canDelete still abstract — implement them too.
}
```

## 5. Testing

ACL classes are plain TS — test without `TestingModule`. Set the CLS values via `runInRequestContext` before constructing the ACL:

```ts
await runInRequestContext({ userId: 'u1', organizationId: 'o1', appAdminCodes: ['HRM'] }, async () => {
  const acl = new EmployeeAcl({ id: 'e1', organizationId: 'o1' });
  expect(acl.canEdit()).toBe(true);
});
```
