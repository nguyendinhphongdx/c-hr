import { OnboardingPlan, OnboardingPlanStatus } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * Subset of OnboardingPlan + preloaded relationships the ACL needs. The
 * service builds the preloaded fields once when fetching the row so we
 * avoid re-querying inside each predicate.
 */
export type OnboardingPlanAclSubject = Pick<
  OnboardingPlan,
  'id' | 'organizationId' | 'status' | 'employeeId'
> & {
  /** employee.user.id — the new hire's User. Null if not linked. */
  _employeeUserId?: string | null;
  /** Cached User.id of every task assignee on this plan. */
  _taskAssigneeUserIds?: string[];
};

export interface OnboardingPlanAclView extends AclView {
  canArchive: boolean;
}

/**
 * - canView    = HRM admin | caller === employee.user.id | caller ∈ assignees
 * - canEdit    = HRM admin AND status !== ARCHIVED
 * - canArchive = HRM admin AND status !== ARCHIVED
 * - canDelete  = HRM admin (allowed even on ARCHIVED — hard delete fallback)
 */
export class OnboardingPlanAcl extends BaseAcl<OnboardingPlanAclSubject, OnboardingPlanAclView> {
  private isHrmAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  private isArchived(): boolean {
    return this.obj.status === OnboardingPlanStatus.ARCHIVED;
  }

  canView(): boolean {
    if (this.isHrmAdmin()) return true;
    const uid = this.ctx.userId;
    if (!uid) return false;
    if (this.obj._employeeUserId && uid === this.obj._employeeUserId) return true;
    return this.obj._taskAssigneeUserIds?.includes(uid) ?? false;
  }

  canEdit(): boolean {
    return this.isHrmAdmin() && !this.isArchived();
  }

  canArchive(): boolean {
    return this.isHrmAdmin() && !this.isArchived();
  }

  canDelete(): boolean {
    return this.isHrmAdmin();
  }

  async getAcl(): Promise<OnboardingPlanAclView> {
    const base = await super.getAcl();
    return { ...base, canArchive: this.canArchive() };
  }
}
