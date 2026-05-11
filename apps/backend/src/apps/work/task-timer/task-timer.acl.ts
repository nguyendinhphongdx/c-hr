import { TaskTimer } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * TaskTimer subject — just the columns the ACL inspects. The parent
 * task's organizationId is passed in so the ACL can call `isAppAdmin`
 * scoped to the right org without re-fetching.
 */
export type TaskTimerAclSubject = Pick<TaskTimer, 'id' | 'taskId' | 'userId' | 'stoppedAt'> & {
  /** Org of the parent task — required for HRM admin check. */
  organizationId: string;
};

export interface TaskTimerAclView extends AclView {
  canStop: boolean;
}

/**
 * Row-level ACL for TaskTimer. Coarse on purpose — the start/list paths
 * are gated by `TaskAcl.canView` on the parent task in the service, so
 * here we only need the per-row rules: who can stop, who can see this
 * specific timer.
 *
 * Rules (ADR 0008):
 *   - canView   = HRM admin | caller === timer.userId
 *   - canStop   = HRM admin | caller === timer.userId
 *   - canEdit   = canStop (no field-level edits today)
 *   - canDelete = HRM admin (manual cleanup only; no UI yet)
 */
export class TaskTimerAcl extends BaseAcl<TaskTimerAclSubject, TaskTimerAclView> {
  private isHrmAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  private isOwner(): boolean {
    const uid = this.ctx.userId;
    return !!uid && uid === this.obj.userId;
  }

  canView(): boolean {
    return this.isHrmAdmin() || this.isOwner();
  }

  canEdit(): boolean {
    return this.canStop();
  }

  canDelete(): boolean {
    return this.isHrmAdmin();
  }

  canStop(): boolean {
    return this.isHrmAdmin() || this.isOwner();
  }

  async getAcl(): Promise<TaskTimerAclView> {
    const base = await super.getAcl();
    return { ...base, canStop: this.canStop() };
  }
}
