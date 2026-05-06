import { Event } from '@prisma/client';

import { AclView, BaseAcl } from '@/common/acl';

/**
 * Subset of Event fields the ACL reads. Lets callers build an ACL from
 * a partial row when range-listing without re-fetching attendees.
 */
export type EventAclSubject = Pick<
  Event,
  'id' | 'organizationId' | 'ownerId' | 'createdById' | 'isPrivate' | 'visibility'
> & {
  /** Optional preloaded attendee userIds — if set, ACL skips the DB lookup. */
  _attendeeUserIds?: string[];
};

export interface EventAclView extends AclView {
  /** May respond to invite (ACCEPT/DECLINE/TENTATIVE). */
  canRespond: boolean;
  /** May see private fields (title, description, attendees). */
  canViewDetail: boolean;
}

/**
 * MVP rules:
 * - View: HRM appadmin in same Org, owner, creator, or invited attendee.
 *   Non-attendees in the Org may still see "busy" (handled by service —
 *   this ACL guards detail; service strips fields when canViewDetail=false).
 * - Edit / Delete: owner, creator, or HRM appadmin.
 * - Respond: any invited attendee whose userId matches ctx.
 */
export class EventAcl extends BaseAcl<EventAclSubject, EventAclView> {
  private isOwner(): boolean {
    return this.obj.ownerId === this.ctx.userId;
  }

  private isCreator(): boolean {
    return this.obj.createdById === this.ctx.userId;
  }

  private isAttendee(): boolean {
    const uid = this.ctx.userId;
    if (!uid) return false;
    const list = this.obj._attendeeUserIds;
    return Array.isArray(list) && list.includes(uid);
  }

  private isHrmAdmin(): boolean {
    return this.ctx.isAppAdmin('HRM', this.obj.organizationId);
  }

  canView(): boolean {
    if (this.isHrmAdmin()) return true;
    if (this.isOwner() || this.isCreator()) return true;
    if (this.isAttendee()) return true;
    // Same-org users may see the event as "busy" without details. The
    // service decides what to release based on canViewDetail.
    return this.ctx.organizationId === this.obj.organizationId;
  }

  canViewDetail(): boolean {
    if (this.isHrmAdmin()) return true;
    if (this.isOwner() || this.isCreator()) return true;
    if (this.isAttendee()) return true;
    if (this.obj.isPrivate) return false;
    if (this.obj.visibility === 'PRIVATE') return false;
    if (this.obj.visibility === 'PUBLIC') {
      return this.ctx.organizationId === this.obj.organizationId;
    }
    // visibility=DEFAULT: same-org sees details (MVP — sharing-mode
    // refinement deferred to F7.5 with CalendarPreferences).
    return this.ctx.organizationId === this.obj.organizationId;
  }

  canEdit(): boolean {
    if (this.isHrmAdmin()) return true;
    return this.isOwner() || this.isCreator();
  }

  canDelete(): boolean {
    if (this.isHrmAdmin()) return true;
    return this.isOwner() || this.isCreator();
  }

  canRespond(): boolean {
    return this.isAttendee();
  }

  async getAcl(): Promise<EventAclView> {
    const base = await super.getAcl();
    return {
      ...base,
      canRespond: this.canRespond(),
      canViewDetail: this.canViewDetail(),
    };
  }
}
