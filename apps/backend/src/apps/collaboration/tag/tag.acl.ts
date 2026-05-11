import { Tag } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * Tag library ACL (Phase 1A).
 *
 * Library = the catalog of tags an Org maintains. Attaching/detaching a tag
 * to a target object is a separate gate handled by `TagService.attach` —
 * that gate delegates to the target object's ACL (`canEdit`).
 *
 * Library rules:
 * - View / list: any user in the same Org (so pickers can render the
 *   library on every entity).
 * - Create / edit / delete: HRM appadmin (keeps the catalog under HR
 *   control; rules can be loosened later when more apps land).
 */
export type TagAclSubject = Pick<Tag, 'id' | 'organizationId'>;

export class TagAcl extends BaseAcl<TagAclSubject, AclView> {
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
