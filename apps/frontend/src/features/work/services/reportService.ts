import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  OrgWorkOverview,
  ProjectReportOverview,
} from "../types/report";

export const workReportService = {
  getProjectOverview: async (
    projectId: ID,
    query: { from?: string; to?: string } = {},
  ): Promise<ProjectReportOverview> => {
    const res = await apiClient.get<ProjectReportOverview>(
      `/projects/${projectId}/reports/overview`,
      { params: query },
    );
    return res.data;
  },

  getOrgOverview: async (): Promise<OrgWorkOverview> => {
    const res = await apiClient.get<OrgWorkOverview>(
      "/work/reports/overview",
    );
    return res.data;
  },
};
