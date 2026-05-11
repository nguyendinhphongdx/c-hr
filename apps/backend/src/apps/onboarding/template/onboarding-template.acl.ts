import { OnboardingTemplate } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * Templates are admin-managed config — view/edit/delete all require HRM
 * appadmin. Service entry uses `requireAppAdmin('HRM')` directly; this
 * class exists for parity with other entities and for any future
 * fine-grained checks (e.g. exposing `view` on detail responses).
 */
export type OnboardingTemplateAclSubject = Pick<OnboardingTemplate, 'id' | 'organizationId'>;

export class OnboardingTemplateAcl extends BaseAcl<OnboardingTemplateAclSubject, AclView> {
  private isHrmAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  canView(): boolean {
    return this.isHrmAdmin();
  }

  canEdit(): boolean {
    return this.isHrmAdmin();
  }

  canDelete(): boolean {
    return this.isHrmAdmin();
  }
}
