import { PayrollPeriod, PayrollStatus } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * Subset of PayrollPeriod the ACL reads. Status drives state-transition
 * gating — `canEdit/close/delete` only on DRAFT, `canPay` only on CLOSED,
 * `canReopen` to undo CLOSED before PAID (PAID itself is locked per spec).
 */
export type PayrollPeriodAclSubject = Pick<PayrollPeriod, 'id' | 'organizationId' | 'status'>;

export interface PayrollPeriodAclView extends AclView {
  /** DRAFT → CLOSED transition. */
  canClose: boolean;
  /** CLOSED → PAID transition (terminal). */
  canPay: boolean;
  /** CLOSED → DRAFT (undo close). PAID is locked — no reopen path. */
  canReopen: boolean;
}

/**
 * Rules (HRM-admin only universe):
 * - canView   = HRM admin
 * - canEdit   = HRM admin AND status === DRAFT
 * - canClose  = HRM admin AND status === DRAFT
 * - canPay    = HRM admin AND status === CLOSED
 * - canDelete = HRM admin AND status === DRAFT
 * - canReopen = HRM admin AND status === CLOSED
 */
export class PayrollPeriodAcl extends BaseAcl<PayrollPeriodAclSubject, PayrollPeriodAclView> {
  private isHrmAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  canView(): boolean {
    return this.isHrmAdmin();
  }

  canEdit(): boolean {
    return this.isHrmAdmin() && this.obj.status === PayrollStatus.DRAFT;
  }

  canClose(): boolean {
    return this.isHrmAdmin() && this.obj.status === PayrollStatus.DRAFT;
  }

  canPay(): boolean {
    return this.isHrmAdmin() && this.obj.status === PayrollStatus.CLOSED;
  }

  canDelete(): boolean {
    return this.isHrmAdmin() && this.obj.status === PayrollStatus.DRAFT;
  }

  canReopen(): boolean {
    return this.isHrmAdmin() && this.obj.status === PayrollStatus.CLOSED;
  }

  async getAcl(): Promise<PayrollPeriodAclView> {
    const base = await super.getAcl();
    return {
      ...base,
      canClose: this.canClose(),
      canPay: this.canPay(),
      canReopen: this.canReopen(),
    };
  }
}
