import { OnboardingPlanStatus, OnboardingTask } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * Subset of OnboardingTask + preloaded plan-status & employee user id.
 * Service builds the preloaded fields when fetching the task so each
 * predicate stays sync.
 */
export type OnboardingTaskAclSubject = Pick<
  OnboardingTask,
  'id' | 'organizationId' | 'assigneeId' | 'status'
> & {
  _planStatus: OnboardingPlanStatus;
  /** employee.user.id of the plan owner — for canView gate. */
  _planEmployeeUserId?: string | null;
};

export interface OnboardingTaskAclView extends AclView {
  canComplete: boolean;
  canReassign: boolean;
}

/**
 * - canView     = HRM admin | caller === assigneeId | caller === plan.employee.user.id
 * - canComplete = HRM admin | caller === assigneeId   (AND plan !== ARCHIVED)
 * - canEdit     = HRM admin AND plan !== ARCHIVED
 * - canReassign = HRM admin AND plan !== ARCHIVED
 * - canDelete   = HRM admin AND plan !== ARCHIVED
 */
export class OnboardingTaskAcl extends BaseAcl<OnboardingTaskAclSubject, OnboardingTaskAclView> {
  private isHrmAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  private isArchived(): boolean {
    return this.obj._planStatus === OnboardingPlanStatus.ARCHIVED;
  }

  private isAssignee(): boolean {
    const uid = this.ctx.userId;
    return !!uid && uid === this.obj.assigneeId;
  }

  private isPlanEmployee(): boolean {
    const uid = this.ctx.userId;
    return !!uid && !!this.obj._planEmployeeUserId && uid === this.obj._planEmployeeUserId;
  }

  canView(): boolean {
    if (this.isHrmAdmin()) return true;
    return this.isAssignee() || this.isPlanEmployee();
  }

  canComplete(): boolean {
    if (this.isArchived()) return false;
    return this.isHrmAdmin() || this.isAssignee();
  }

  canEdit(): boolean {
    return this.isHrmAdmin() && !this.isArchived();
  }

  canReassign(): boolean {
    return this.isHrmAdmin() && !this.isArchived();
  }

  canDelete(): boolean {
    return this.isHrmAdmin() && !this.isArchived();
  }

  async getAcl(): Promise<OnboardingTaskAclView> {
    const base = await super.getAcl();
    return {
      ...base,
      canComplete: this.canComplete(),
      canReassign: this.canReassign(),
    };
  }
}
