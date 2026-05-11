import { Project, ProjectRole } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * Subset of Project fields the ACL reads. Member roles are passed in via
 * `_memberRoles` (userId → role) when the caller has them preloaded —
 * keeps list endpoints cheap. Without it, predicates that need member
 * info return false (caller is expected to preload for hot paths).
 */
export type ProjectAclSubject = Pick<
  Project,
  'id' | 'organizationId' | 'ownerId' | 'visibility'
> & {
  /** Map of userId → role for this project. Optional preload. */
  _memberRoles?: Map<string, ProjectRole>;
};

export interface ProjectAclView extends AclView {
  canManageMembers: boolean;
  canArchive: boolean;
  canTransferOwnership: boolean;
}

/**
 * Project ACL — drives row-level permission for everything inside a
 * project (members, sections, future tasks).
 *
 * - `canView`         = HRM admin | PUBLIC + same org | any member
 * - `canEdit`         = HRM admin | OWNER | EDITOR
 * - `canDelete`       = HRM admin | OWNER
 * - `canManageMembers`= HRM admin | OWNER
 * - `canArchive`      = canEdit
 * - `canTransferOwnership` = HRM admin | current OWNER
 */
export class ProjectAcl extends BaseAcl<ProjectAclSubject, ProjectAclView> {
  private isHrmAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  private callerUserId(): string | null {
    return this.ctx.userId ?? null;
  }

  private callerRole(): ProjectRole | null {
    const uid = this.callerUserId();
    if (!uid) return null;
    return this.obj._memberRoles?.get(uid) ?? null;
  }

  private isOwner(): boolean {
    const uid = this.callerUserId();
    if (uid && this.obj.ownerId === uid) return true;
    return this.callerRole() === 'OWNER';
  }

  private isEditor(): boolean {
    const role = this.callerRole();
    return role === 'OWNER' || role === 'EDITOR';
  }

  private isMember(): boolean {
    return this.callerRole() !== null || this.isOwner();
  }

  canView(): boolean {
    if (this.isHrmAdmin()) return true;
    if (this.isMember()) return true;
    if (this.obj.visibility === 'PUBLIC' && this.ctx.organizationId === this.obj.organizationId) {
      return true;
    }
    return false;
  }

  canEdit(): boolean {
    if (this.isHrmAdmin()) return true;
    return this.isEditor();
  }

  canDelete(): boolean {
    if (this.isHrmAdmin()) return true;
    return this.isOwner();
  }

  canManageMembers(): boolean {
    if (this.isHrmAdmin()) return true;
    return this.isOwner();
  }

  canArchive(): boolean {
    return this.canEdit();
  }

  canTransferOwnership(): boolean {
    if (this.isHrmAdmin()) return true;
    return this.isOwner();
  }

  async getAcl(): Promise<ProjectAclView> {
    const base = await super.getAcl();
    return {
      ...base,
      canManageMembers: this.canManageMembers(),
      canArchive: this.canArchive(),
      canTransferOwnership: this.canTransferOwnership(),
    };
  }
}
