import type { ID, ISODate, Nullable } from "@/lib/types";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface CorrectionParticipant {
  id: ID;
  code: string;
  user: Nullable<{
    id: ID;
    name: Nullable<string>;
    email: string;
  }>;
}

export interface AttendanceCorrection {
  id: ID;
  organizationId: ID;
  requesterId: ID;
  approverId: Nullable<ID>;
  date: ISODate;
  requestedCheckInAt: Nullable<ISODate>;
  requestedCheckOutAt: Nullable<ISODate>;
  reason: string;
  status: RequestStatus;
  decisionNote: Nullable<string>;
  decidedAt: Nullable<ISODate>;
  createdAt: ISODate;
  updatedAt: ISODate;
  requester: CorrectionParticipant;
  approver: Nullable<CorrectionParticipant>;
}

export interface CreateAttendanceCorrectionInput {
  date: string;
  requestedCheckInAt?: string;
  requestedCheckOutAt?: string;
  reason: string;
  approverId: ID;
}

export interface DecideCorrectionInput {
  decisionNote?: string;
}

export type CorrectionListScope = "mine" | "incoming" | "all";

export interface ListCorrectionsQuery {
  status?: RequestStatus;
  from?: string;
  to?: string;
  scope?: Exclude<CorrectionListScope, "all">;
}
