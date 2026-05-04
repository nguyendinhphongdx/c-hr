import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  ApproverCandidatesResponse,
  OrgChartEmployee,
} from "../types";

export const orgchartService = {
  reportingLine: async (employeeId: ID): Promise<OrgChartEmployee[]> => {
    const res = await apiClient.get<OrgChartEmployee[]>(
      "/orgchart/reporting-line",
      { params: { employeeId } },
    );
    return res.data;
  },

  approverCandidates: async (
    employeeId: ID,
  ): Promise<ApproverCandidatesResponse> => {
    const res = await apiClient.get<ApproverCandidatesResponse>(
      "/orgchart/approver-candidates",
      { params: { employeeId } },
    );
    return res.data;
  },
};
