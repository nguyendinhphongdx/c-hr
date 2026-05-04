import { apiClient } from "@/lib/api/client";
import type { OrganizationSummary } from "@/features/auth";

export interface UpdateOrganizationInput {
  name?: string;
  timezone?: string;
  currency?: string;
}

export const organizationService = {
  getMine: async (): Promise<OrganizationSummary> => {
    const res = await apiClient.get<OrganizationSummary>("/organizations/me");
    return res.data;
  },

  updateMine: async (
    data: UpdateOrganizationInput,
  ): Promise<OrganizationSummary> => {
    const res = await apiClient.patch<OrganizationSummary>(
      "/organizations/me",
      data,
    );
    return res.data;
  },
};
