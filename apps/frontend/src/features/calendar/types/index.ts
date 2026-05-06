import type { ID, ISODate, Nullable } from "@/lib/types";

export type EventStatus = "CONFIRMED" | "TENTATIVE" | "CANCELLED";
export type EventVisibility = "DEFAULT" | "PUBLIC" | "PRIVATE";
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

export type EventScope = "mine" | "invited" | "all";

export interface ListEventsQuery {
  from: string; // ISO
  to: string;   // ISO
  scope?: EventScope;
  userIds?: string[];
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
