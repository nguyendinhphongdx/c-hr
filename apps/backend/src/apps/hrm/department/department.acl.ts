import { Department } from '@prisma/client';

import { BaseAcl } from '@/common/acl';

/**
 * Subset of Department fields the ACL reads. Lets callers build an ACL
 * from `{ id, organizationId }` without fetching the full row.
 */
export type DepartmentAclSubject = Pick<Department, 'id' | 'organizationId'>;

export class DepartmentAcl extends BaseAcl<DepartmentAclSubject> {
  canView(): boolean {
    // Tenant gate. Repos already filter `*ByOrg`, so any user in the
    // same org can see departments — the org chart is shared.
    return this.ctx.organizationId === this.obj.organizationId;
  }

  canEdit(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  canDelete(): boolean {
    // Departments soft-delete; same gate as edit for MVP.
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }
}
