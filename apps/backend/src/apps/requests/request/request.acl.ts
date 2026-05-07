import { Request } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * Subset of Request fields the ACL reads. Lets callers build an ACL
 * from a partial object (e.g. status update payloads) without re-fetching.
 */
export type RequestAclSubject = Pick<
  Request,
  'id' | 'organizationId' | 'requesterId' | 'approverId' | 'status'
>;

export interface RequestAclView extends AclView {
  /** Assigned approver may decide while still PENDING. */
  canApprove: boolean;
  /** Requester may withdraw their own PENDING request. */
  canCancel: boolean;
}

export class RequestAcl extends BaseAcl<RequestAclSubject, RequestAclView> {
  canView(): boolean {
    if (this.ctx.isAppAdmin('HRM', this.obj.organizationId)) return true;
    const eid = this.ctx.employeeId;
    if (!eid) return false;
    return this.obj.requesterId === eid || this.obj.approverId === eid;
  }

  canEdit(): boolean {
    // Requester may amend the payload only while still PENDING.
    return this.obj.requesterId === this.ctx.employeeId && this.obj.status === 'PENDING';
  }

  canDelete(): boolean {
    // Hard-delete is admin-only; requesters use `canCancel` to withdraw.
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  canApprove(): boolean {
    return this.obj.approverId === this.ctx.employeeId && this.obj.status === 'PENDING';
  }

  canCancel(): boolean {
    return this.obj.requesterId === this.ctx.employeeId && this.obj.status === 'PENDING';
  }

  async getAcl(): Promise<RequestAclView> {
    const base = await super.getAcl();
    return {
      ...base,
      canApprove: this.canApprove(),
      canCancel: this.canCancel(),
    };
  }
}
