import { apiClient } from "@/lib/api/client";

import type {
  OrphanProfile,
  OrphanSuggestedOrg,
  OrphanOrgSearchResult,
  SubmitJoinRequestInput,
} from "../types";

export const orphanService = {
  me: async (): Promise<OrphanProfile> => {
    const res = await apiClient.get<OrphanProfile>("/sso/entra/orphan/me");
    return res.data;
  },

  suggestedOrgs: async (): Promise<OrphanSuggestedOrg[]> => {
    const res = await apiClient.get<OrphanSuggestedOrg[]>(
      "/sso/entra/orphan/suggested-orgs",
    );
    return res.data;
  },

  searchOrgs: async (q: string): Promise<OrphanOrgSearchResult[]> => {
    const res = await apiClient.get<OrphanOrgSearchResult[]>(
      "/sso/entra/orphan/search-orgs",
      { params: { q } },
    );
    return res.data;
  },

  submitJoinRequest: async (input: SubmitJoinRequestInput): Promise<unknown> => {
    const res = await apiClient.post(
      "/sso/entra/orphan/join-request",
      input,
    );
    return res.data;
  },

  clear: async (): Promise<void> => {
    await apiClient.delete("/sso/entra/orphan");
  },
};
