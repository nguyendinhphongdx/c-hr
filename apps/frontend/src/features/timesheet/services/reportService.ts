import { apiClient } from "@/lib/api/client";

import type {
  EmployeeSummaryRow,
  OverviewResponse,
  TimesheetSummaryQuery,
} from "../types/report";

export const timesheetReportService = {
  summary: async (
    query: TimesheetSummaryQuery,
  ): Promise<EmployeeSummaryRow[]> => {
    const res = await apiClient.get<EmployeeSummaryRow[]>(
      "/timesheet/reports/summary",
      { params: query },
    );
    return res.data;
  },

  overview: async (
    query: TimesheetSummaryQuery,
  ): Promise<OverviewResponse> => {
    const res = await apiClient.get<OverviewResponse>(
      "/timesheet/reports/overview",
      { params: query },
    );
    return res.data;
  },

  /**
   * Download the report as an XLSX. Returns the blob; caller is
   * responsible for triggering the browser save.
   */
  summaryXlsx: async (query: TimesheetSummaryQuery): Promise<Blob> => {
    const res = await apiClient.get<Blob>("/timesheet/reports/summary.xlsx", {
      params: query,
      responseType: "blob",
    });
    return res.data;
  },
};
