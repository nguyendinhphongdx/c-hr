"use client";

import { useQuery } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { workReportService } from "../services/reportService";

export const workReportKeys = {
  projectOverview: (projectId: ID, query: { from?: string; to?: string }) =>
    ["work-reports", "project-overview", projectId, query] as const,
  orgOverview: () => ["work-reports", "org-overview"] as const,
};

export function useProjectOverview(
  projectId: ID | null,
  query: { from?: string; to?: string } = {},
) {
  return useQuery({
    queryKey: workReportKeys.projectOverview(projectId ?? "none", query),
    queryFn: () => workReportService.getProjectOverview(projectId as ID, query),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useOrgOverview(enabled = true) {
  return useQuery({
    queryKey: workReportKeys.orgOverview(),
    queryFn: () => workReportService.getOrgOverview(),
    enabled,
    staleTime: 30 * 1000,
  });
}
