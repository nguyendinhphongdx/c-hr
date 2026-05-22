import { Job } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

export type JobAclSubject = Pick<
  Job,
  'id' | 'organizationId' | 'hiringManagerId' | 'createdById'
>;

export interface JobAclView extends AclView {
  canPublish: boolean;
  canClose: boolean;
}

/**
 * Job ACL.
 *
 * - canView   = same-org user (no row-level secrets; public listing).
 * - canEdit   = RECRUITMENT/HRM appadmin | hiringManager | createdBy
 * - canDelete = RECRUITMENT/HRM appadmin | createdBy
 * - canPublish/canClose = canEdit
 */
export class JobAcl extends BaseAcl<JobAclSubject, JobAclView> {
  private isAdmin(): boolean {
    return (
      this.ctx.isAppAdmin('RECRUITMENT', this.obj.organizationId) ||
      this.ctx.isAppAdmin('HRM', this.obj.organizationId)
    );
  }

  private isOwner(): boolean {
    const uid = this.ctx.userId;
    if (!uid) return false;
    return this.obj.createdById === uid || this.obj.hiringManagerId === uid;
  }

  canView(): boolean {
    return this.ctx.organizationId === this.obj.organizationId;
  }

  canEdit(): boolean {
    if (this.isAdmin()) return true;
    return this.isOwner();
  }

  canDelete(): boolean {
    if (this.isAdmin()) return true;
    const uid = this.ctx.userId;
    return !!uid && this.obj.createdById === uid;
  }

  canPublish(): boolean {
    return this.canEdit();
  }

  canClose(): boolean {
    return this.canEdit();
  }

  async getAcl(): Promise<JobAclView> {
    const base = await super.getAcl();
    return {
      ...base,
      canPublish: this.canPublish(),
      canClose: this.canClose(),
    };
  }
}
