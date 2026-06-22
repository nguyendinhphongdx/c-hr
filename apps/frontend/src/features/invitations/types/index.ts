import type { ID, ISODate, Nullable } from "@/lib/types";

export type InvitationKind = "ADMIN_INVITE" | "SELF_REQUEST";

export type InvitationStatus =
  | "PENDING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export interface Invitation {
  id: ID;
  organizationId: ID;
  email: string;
  name: Nullable<string>;
  kind: InvitationKind;
  inviteToken: Nullable<string>;
  expiresAt: Nullable<ISODate>;
  invitedById: Nullable<ID>;
  externalUserId: Nullable<string>;
  message: Nullable<string>;
  status: InvitationStatus;
  decidedById: Nullable<ID>;
  decidedAt: Nullable<ISODate>;
  decisionNote: Nullable<string>;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface InvitationCreateResponse extends Invitation {
  /** Pre-built `/invite/<token>` URL the admin can copy. */
  acceptUrl: string;
}

export interface CreateInviteInput {
  email: string;
  name?: string;
  message?: string;
}

export interface ListInvitationsQuery {
  kind?: InvitationKind;
  status?: InvitationStatus;
}

export interface DecideInput {
  decisionNote?: string;
}

/** Shape of the public token endpoint — non-sensitive view shown on
 *  the /invite/<token> page before the invitee accepts. */
export interface PublicInvitationView {
  id: ID;
  organizationId: ID;
  organizationName: string;
  organizationSlug: string;
  email: string;
  name: Nullable<string>;
  message: Nullable<string>;
  status: InvitationStatus;
  expiresAt: Nullable<ISODate>;
}

export interface InvitationByTokenResponse {
  invitation: Nullable<PublicInvitationView>;
  reason?: "invalid_or_expired";
}

export interface AcceptByTokenInput {
  password: string;
  name?: string;
}
