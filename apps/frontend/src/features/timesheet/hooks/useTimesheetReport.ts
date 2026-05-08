"use client";

import { useQuery } from "@tanstack/react-query";

import { timesheetReportService } from "../services/reportService";
import type { TimesheetSummaryQuery } from "../types/report";

export const timesheetReportKeys = {
  summary: (q: TimesheetSummaryQuery) =>
    ["timesheet-reports", "summary", q] as const,
  overview: (q: TimesheetSummaryQuery) =>
    ["timesheet-reports", "overview", q] as const,
};

export function useTimesheetSummary(query: TimesheetSummaryQuery, enabled = true) {
  return useQuery({
    queryKey: timesheetReportKeys.summary(query),
    queryFn: () => timesheetReportService.summary(query),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useTimesheetOverview(query: TimesheetSummaryQuery, enabled = true) {
  return useQuery({
    queryKey: timesheetReportKeys.overview(query),
    queryFn: () => timesheetReportService.overview(query),
    enabled,
    staleTime: 30 * 1000,
  });
}
