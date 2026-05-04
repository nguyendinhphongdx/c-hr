import type { ID, Nullable } from "@/lib/types";

export interface OrgUser {
  id: ID;
  email: string;
  name: Nullable<string>;
  /** When set, this user is already linked to an Employee. */
  employeeId: Nullable<ID>;
}

export interface ListOrgUsersQuery {
  q?: string;
  availableForLink?: boolean;
  /** When editing an existing Employee, include the user currently linked to it. */
  includeLinkedTo?: ID;
  limit?: number;
}
