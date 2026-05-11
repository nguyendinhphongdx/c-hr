import { PayrollItem, PayrollStatus } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * The payroll item is owned by HR, but the employee whose payslip it
 * represents must be able to read their own row (Phase 4 will let them
 * export a payslip PDF). Subject embeds the parent period's status and
 * the linked User.id of the employee so the ACL can answer both
 * questions sync.
 */
export type PayrollItemAclSubject = Pick<
  PayrollItem,
  'id' | 'organizationId' | 'periodId' | 'employeeId'
> & {
  _periodStatus: PayrollStatus;
  /** Linked User.id for the employee, if any (for self-view of payslip). */
  _employeeUserId?: string | null;
};

export interface PayrollItemAclView extends AclView {
  /** Phase 4 — payslip export gating. Same as canView for now. */
  canExport: boolean;
}

/**
 * Rules:
 * - canView   = HRM admin OR ctx.userId === _employeeUserId
 * - canEdit   = HRM admin AND _periodStatus === DRAFT
 * - canDelete = HRM admin AND _periodStatus === DRAFT (items deleted only
 *               by cascading the period; we still expose canDelete=false
 *               for non-DRAFT so the FE can hide an item-level delete
 *               button if it ever shows one).
 * - canExport = canView
 */
export class PayrollItemAcl extends BaseAcl<PayrollItemAclSubject, PayrollItemAclView> {
  private isHrmAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  private isSelf(): boolean {
    const uid = this.ctx.userId;
    if (!uid) return false;
    return !!this.obj._employeeUserId && this.obj._employeeUserId === uid;
  }

  canView(): boolean {
    return this.isHrmAdmin() || this.isSelf();
  }

  canEdit(): boolean {
    return this.isHrmAdmin() && this.obj._periodStatus === PayrollStatus.DRAFT;
  }

  canDelete(): boolean {
    return this.isHrmAdmin() && this.obj._periodStatus === PayrollStatus.DRAFT;
  }

  canExport(): boolean {
    return this.canView();
  }

  async getAcl(): Promise<PayrollItemAclView> {
    const base = await super.getAcl();
    return {
      ...base,
      canExport: this.canExport(),
    };
  }
}
