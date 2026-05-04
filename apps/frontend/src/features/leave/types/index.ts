import type { ID, ISODate, Nullable } from "@/lib/types";

export type LeaveType = "ANNUAL" | "SICK" | "UNPAID" | "MATERNITY" | "OTHER";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LeaveRequestParticipant {
  id: ID;
  code: string;
  user: Nullable<{
    id: ID;
    name: Nullable<string>;
    email: string;
  }>;
}

export interface LeaveRequest {
  id: ID;
  organizationId: ID;
  requesterId: ID;
  approverId: Nullable<ID>;
  type: LeaveType;
  startDate: ISODate;
  endDate: ISODate;
  reason: Nullable<string>;
  status: RequestStatus;
  decisionNote: Nullable<string>;
  decidedAt: Nullable<ISODate>;
  createdAt: ISODate;
  updatedAt: ISODate;
  requester: LeaveRequestParticipant;
  approver: Nullable<LeaveRequestParticipant>;
}

export interface CreateLeaveRequestInput {
  type: LeaveType;
  startDate: string;
  endDate: string;
  approverId: ID;
  reason?: string;
}

export interface DecideLeaveRequestInput {
  decisionNote?: string;
}

export type LeaveListScope = "mine" | "incoming" | "all";

export interface ListLeaveRequestsQuery {
  status?: RequestStatus;
  from?: string;
  to?: string;
  scope?: Exclude<LeaveListScope, "all">;
}
