import { ProjectRole, ProjectVisibility, Task } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

import { ProjectAcl, ProjectAclSubject } from '../project/project.acl';

/**
 * Subset of Task fields the ACL reads. `_project` and `_watcherUserIds`
 * are optional preloads — service builds them so list endpoints stay
 * cheap. Without them, predicates that need them gracefully degrade
 * (e.g. canView still works via assignee/reporter checks).
 */
export type TaskAclSubject = Pick<
  Task,
  'id' | 'organizationId' | 'projectId' | 'assigneeId' | 'reporterId' | 'deletedAt'
> & {
  /** Preloaded project ACL data — caller fills to avoid re-fetch. */
  _project?: {
    ownerId: string;
    visibility: ProjectVisibility;
    _memberRoles?: Map<string, ProjectRole>;
  };
  /** Preloaded watcher userIds — caller fills for quick canView. */
  _watcherUserIds?: string[];
};

export interface TaskAclView extends AclView {
  canComment: boolean;
  canAssign: boolean;
  canWatch: boolean;
}

/**
 * Task ACL — gated by the parent Project ACL + per-row role on the task.
 *
 * - `canView`    = HRM admin | project canView | assignee | reporter | watcher
 * - `canEdit`    = HRM admin | project OWNER/EDITOR | assignee | reporter
 * - `canDelete`  = HRM admin | project OWNER | reporter
 * - `canComment` = canView
 * - `canAssign`  = canEdit
 * - `canWatch`   = canView
 */
export class TaskAcl extends BaseAcl<TaskAclSubject, TaskAclView> {
  private isHrmAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  private callerUserId(): string | null {
    return this.ctx.userId ?? null;
  }

  private isReporter(): boolean {
    const uid = this.callerUserId();
    return !!uid && uid === this.obj.reporterId;
  }

  private isAssignee(): boolean {
    const uid = this.callerUserId();
    return !!uid && !!this.obj.assigneeId && uid === this.obj.assigneeId;
  }

  private isWatcher(): boolean {
    const uid = this.callerUserId();
    if (!uid) return false;
    return this.obj._watcherUserIds?.includes(uid) ?? false;
  }

  private projectAcl(): ProjectAcl | null {
    const p = this.obj._project;
    if (!p) return null;
    const subject: ProjectAclSubject = {
      id: this.obj.projectId,
      organizationId: this.obj.organizationId,
      ownerId: p.ownerId,
      visibility: p.visibility,
      _memberRoles: p._memberRoles,
    };
    return new ProjectAcl(subject);
  }

  private projectRole(): ProjectRole | null {
    const uid = this.callerUserId();
    if (!uid) return null;
    return this.obj._project?._memberRoles?.get(uid) ?? null;
  }

  private isProjectOwner(): boolean {
    const uid = this.callerUserId();
    if (!uid) return false;
    return this.obj._project?.ownerId === uid || this.projectRole() === 'OWNER';
  }

  private isProjectEditor(): boolean {
    const role = this.projectRole();
    return role === 'OWNER' || role === 'EDITOR';
  }

  canView(): boolean {
    if (this.isHrmAdmin()) return true;
    if (this.isReporter() || this.isAssignee() || this.isWatcher()) return true;
    const pAcl = this.projectAcl();
    if (pAcl && pAcl.canView()) return true;
    return false;
  }

  canEdit(): boolean {
    if (this.isHrmAdmin()) return true;
    if (this.isReporter() || this.isAssignee()) return true;
    if (this.isProjectOwner() || this.isProjectEditor()) return true;
    return false;
  }

  canDelete(): boolean {
    if (this.isHrmAdmin()) return true;
    if (this.isReporter()) return true;
    return this.isProjectOwner();
  }

  canComment(): boolean {
    return this.canView();
  }

  canAssign(): boolean {
    return this.canEdit();
  }

  canWatch(): boolean {
    return this.canView();
  }

  async getAcl(): Promise<TaskAclView> {
    const base = await super.getAcl();
    return {
      ...base,
      canComment: this.canComment(),
      canAssign: this.canAssign(),
      canWatch: this.canWatch(),
    };
  }
}
