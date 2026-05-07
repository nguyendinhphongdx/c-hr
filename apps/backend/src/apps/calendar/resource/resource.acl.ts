import { Resource } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * MVP rules:
 * - Anyone in the org may VIEW resources (so they show in the picker
 *   when creating events).
 * - Only HRM appadmin may CREATE / UPDATE / DELETE — keeps the resource
 *   catalog under HR control. Per-department ownership (booking gating
 *   via `managingDepartmentId`) is a deferred follow-up.
 */
export type ResourceAclSubject = Pick<Resource, 'id' | 'organizationId'>;

export class ResourceAcl extends BaseAcl<ResourceAclSubject, AclView> {
  canView(): boolean {
    return this.ctx.organizationId === this.obj.organizationId;
  }

  canEdit(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  canDelete(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }
}
