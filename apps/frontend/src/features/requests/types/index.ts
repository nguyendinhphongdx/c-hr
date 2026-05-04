import type { ID, ISODate, Nullable } from "@/lib/types";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "datetime"
  | "enum";

export interface EnumOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  helperText?: string;
  options?: EnumOption[];
  min?: number;
  max?: number;
  maxLength?: number;
}

export interface FieldsSchema {
  fields: FieldDefinition[];
}

export interface RequestGroup {
  id: ID;
  code: string;
  name: string;
  description: Nullable<string>;
  fieldsSchema: FieldsSchema;
  isActive: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface RequestParticipant {
  id: ID;
  code: string;
  user: Nullable<{
    id: ID;
    name: Nullable<string>;
    email: string;
  }>;
}

export interface RequestRow {
  id: ID;
  organizationId: ID;
  groupId: ID;
  requesterId: ID;
  approverId: Nullable<ID>;
  status: RequestStatus;
  data: Record<string, unknown>;
  decisionNote: Nullable<string>;
  decidedAt: Nullable<ISODate>;
  createdAt: ISODate;
  updatedAt: ISODate;
  group: RequestGroup;
  requester: RequestParticipant;
  approver: Nullable<RequestParticipant>;
}

export interface CreateRequestInput {
  groupId: ID;
  approverId: ID;
  data: Record<string, unknown>;
}

export interface DecideRequestInput {
  decisionNote?: string;
}

export type RequestListScope = "mine" | "incoming" | "all";

export interface ListRequestsQuery {
  status?: RequestStatus;
  groupId?: ID;
  scope?: Exclude<RequestListScope, "all">;
}
