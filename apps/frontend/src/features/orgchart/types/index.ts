import type { ID, Nullable } from "@/lib/types";

/** Subset of Employee returned by /orgchart endpoints (no full Employee row). */
export interface OrgChartEmployee {
  id: ID;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  title: Nullable<string>;
}

export interface ApproverCandidate {
  userId: ID;
  employeeId: Nullable<ID>;
  email: string;
  name: Nullable<string>;
}

export interface ApproverCandidatesResponse {
  suggested: Nullable<ApproverCandidate>;
  candidates: ApproverCandidate[];
}
