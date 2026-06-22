import type { ID, Nullable } from "@/lib/types";

export interface StartSsoResponse {
  authorizeUrl: string;
}

export interface OrphanProfile {
  email: string;
  name: Nullable<string>;
}

export interface OrphanSuggestedOrg {
  id: ID;
  name: string;
  slug: string;
  memberCount: number;
}

export interface OrphanOrgSearchResult {
  id: ID;
  name: string;
  slug: string;
}

export interface SubmitJoinRequestInput {
  organizationId: ID;
  message?: string;
}
