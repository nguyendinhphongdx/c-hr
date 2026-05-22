import { AclView, BaseAcl } from '@/common/acl';

export interface ApplicationAclSubject {
  id: string;
  organizationId: string;
  job: { id: string; createdById?: string | null; hiringManagerId?: string | null };
}

/**
 * Application ACL. Mirror of JobAcl but checks the parent Job for
 * ownership signals (createdBy / hiringManager). Pure read = recruiter
 * roles + the job's owners.
 */
export class ApplicationAcl extends BaseAcl<ApplicationAclSubject> {
  private isAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  private isJobOwner(): boolean {
    const uid = this.ctx.userId;
    if (!uid) return false;
    const j = this.obj.job;
    return j.createdById === uid || j.hiringManagerId === uid;
  }

  canView(): boolean {
    return this.isAdmin() || this.isJobOwner();
  }

  canEdit(): boolean {
    return this.isAdmin() || this.isJobOwner();
  }

  canDelete(): boolean {
    return this.isAdmin();
  }
}
