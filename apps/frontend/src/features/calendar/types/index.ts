import type { ID, ISODate, Nullable } from "@/lib/types";

export type EventStatus = "CONFIRMED" | "TENTATIVE" | "CANCELLED";
export type EventVisibility = "DEFAULT" | "PUBLIC" | "PRIVATE" | "BUSY_ONLY";
export type EventProvider = "LOCAL" | "GOOGLE" | "MICROSOFT";
export type AttendeeResponse =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "TENTATIVE";

export interface UserSummary {
  id: ID;
  name: Nullable<string>;
  email: string;
  avatar: Nullable<string>;
}

export interface EventAttendeeRow {
  id: ID;
  eventId: ID;
  userId: Nullable<ID>;
  email: Nullable<string>;
  displayName: Nullable<string>;
  response: AttendeeResponse;
  isOptional: boolean;
  isOrganizer: boolean;
  respondedAt: Nullable<ISODate>;
  user: Nullable<UserSummary>;
}

export interface EventRow {
  id: ID;
  organizationId: ID;
  ownerId: ID;
  createdById: ID;
  title: string;
  description: Nullable<string>;
  location: Nullable<string>;
  conferenceUrl: Nullable<string>;
  isAllDay: boolean;
  startAt: ISODate;
  endAt: ISODate;
  status: EventStatus;
  visibility: EventVisibility;
  isPrivate: boolean;
  color: Nullable<string>;
  provider: EventProvider;
  externalId: Nullable<string>;
  externalEtag: Nullable<string>;
  icalUid: Nullable<string>;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt: Nullable<ISODate>;
  owner: UserSummary;
  createdBy: UserSummary;
  attendees: EventAttendeeRow[];
  resources?: EventResourceRow[];
}

// ── F7.2 Resources ─────────────────────────────────────────────────

export type ResourceKind = "ROOM" | "EQUIPMENT" | "VEHICLE";

export interface ResourceRow {
  id: ID;
  organizationId: ID;
  kind: ResourceKind;
  name: string;
  description: Nullable<string>;
  location: Nullable<string>;
  capacity: Nullable<number>;
  color: Nullable<string>;
  isActive: boolean;
  managingDepartmentId: Nullable<ID>;
  managingDepartment: Nullable<{ id: ID; name: string }>;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface CreateResourceInput {
  kind: ResourceKind;
  name: string;
  description?: string;
  location?: string;
  capacity?: number;
  color?: string;
  isActive?: boolean;
  managingDepartmentId?: ID;
}

export interface UpdateResourceInput {
  kind?: ResourceKind;
  name?: string;
  description?: Nullable<string>;
  location?: Nullable<string>;
  capacity?: Nullable<number>;
  color?: Nullable<string>;
  isActive?: boolean;
  managingDepartmentId?: Nullable<ID>;
}

export interface ListResourcesQuery {
  kind?: ResourceKind;
  q?: string;
  activeOnly?: boolean;
}

export interface EventResourceRow {
  id: ID;
  eventId: ID;
  resourceId: ID;
  resourceNameSnapshot: Nullable<string>;
  resource: {
    id: ID;
    kind: ResourceKind;
    name: string;
    color: Nullable<string>;
    location: Nullable<string>;
  };
}

export interface EventDetail extends EventRow {
  view: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canRespond: boolean;
    canViewDetail: boolean;
  };
}

// ── Free/busy ──────────────────────────────────────────────────────
//
// BE keys results by `userId` (Event.ownerId / EventAttendee.userId
// reference User, not Employee). FE attendee drafts already carry a
// `userId`, so no extra mapping is needed.

export type FreeBusyStatus = "BUSY" | "FREE";

export interface FreeBusyConflict {
  id: ID;
  title: string;
  startAt: ISODate;
  endAt: ISODate;
  visibility: EventVisibility;
}

export interface FreeBusyRow {
  userId: ID;
  status: FreeBusyStatus;
  conflicts: FreeBusyConflict[];
}

export interface FreeBusyQuery {
  userIds: ID[];
  from: string;
  to: string;
}

export type EventScope = "mine" | "invited" | "all";

export interface ListEventsQuery {
  from: string; // ISO
  to: string;   // ISO
  scope?: EventScope;
  userIds?: string[];
  /** Show only events booked on this resource (Phòng họp tab). */
  resourceId?: ID;
}

export interface CreateEventAttendeeInput {
  userId?: ID;
  email?: string;
  displayName?: string;
  isOptional?: boolean;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  conferenceUrl?: string;
  isAllDay?: boolean;
  startAt: string;
  endAt: string;
  visibility?: EventVisibility;
  isPrivate?: boolean;
  color?: string;
  ownerId?: ID;
  attendees?: CreateEventAttendeeInput[];
  resourceIds?: ID[];
}

export interface UpdateEventInput {
  title?: string;
  description?: Nullable<string>;
  location?: Nullable<string>;
  conferenceUrl?: Nullable<string>;
  isAllDay?: boolean;
  startAt?: string;
  endAt?: string;
  status?: EventStatus;
  visibility?: EventVisibility;
  isPrivate?: boolean;
  color?: Nullable<string>;
  /** Replace the full resource booking set; pass `[]` to clear. */
  resourceIds?: ID[];
}

/**
 * Shape react-big-calendar consumes for each rendered event. We keep the
 * full `EventRow` on `resource` so chip + detail components can read
 * status/color/etc. without losing data after RBC's internal mapping.
 */
export interface CalEvent {
  id: ID;
  title: string;
  start: Date;
  end: Date;
  resource: EventRow;
  allDay?: boolean;
}
