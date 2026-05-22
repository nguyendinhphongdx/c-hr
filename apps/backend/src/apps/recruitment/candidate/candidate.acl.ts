import { Candidate } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

export type CandidateAclSubject = Pick<
  Candidate,
  'id' | 'organizationId' | 'createdById'
>;

/**
 * Candidate ACL.
 *
 * Candidates carry sensitive PII (expected salary, contact, resume).
 * Only recruiters (HRM appadmin) and the creator can view
 * by default. Phase 2 may relax to hiring managers of jobs they're
 * applied to — defer until we have that data preloaded cheaply.
 */
export class CandidateAcl extends BaseAcl<CandidateAclSubject> {
  private isAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  private isCreator(): boolean {
    const uid = this.ctx.userId;
    return !!uid && this.obj.createdById === uid;
  }

  canView(): boolean {
    return this.isAdmin() || this.isCreator();
  }

  canEdit(): boolean {
    return this.isAdmin() || this.isCreator();
  }

  canDelete(): boolean {
    return this.isAdmin();
  }
}
