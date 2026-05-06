import { Employee } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * Subset of Employee fields the ACL actually reads. Lets timesheet /
 * attendance-log services build an ACL from `{ id, organizationId }`
 * without first fetching the full row.
 */
export type EmployeeAclSubject = Pick<Employee, 'id' | 'organizationId'>;

export interface EmployeeAclView extends AclView {
  /** Self or HRM appadmin — for sensitive personal data (logs, salary). */
  canViewLogs: boolean;
}

export class EmployeeAcl extends BaseAcl<EmployeeAclSubject, EmployeeAclView> {
  canView(): boolean {
    // Tenant gate. Repos already filter `*ByOrg`, so any user in the
    // same org can see the directory entry. Sensitive fields are
    // gated separately via `canViewLogs`.
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
