"use client";

import { useQuery } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { orgchartService } from "../services/orgchartService";

export const orgchartKeys = {
  reportingLine: (employeeId: ID) =>
    ["orgchart", "reporting-line", employeeId] as const,
  approverCandidates: (employeeId: ID) =>
    ["orgchart", "approver-candidates", employeeId] as const,
};

export function useReportingLine(employeeId: ID | null) {
  return useQuery({
    queryKey: employeeId
      ? orgchartKeys.reportingLine(employeeId)
      : ["orgchart", "reporting-line", "none"],
    queryFn: () => orgchartService.reportingLine(employeeId as ID),
    enabled: !!employeeId,
    staleTime: 30 * 1000,
  });
}

export function useApproverCandidates(employeeId: ID | null) {
  return useQuery({
    queryKey: employeeId
      ? orgchartKeys.approverCandidates(employeeId)
      : ["orgchart", "approver-candidates", "none"],
    queryFn: () => orgchartService.approverCandidates(employeeId as ID),
    enabled: !!employeeId,
    staleTime: 30 * 1000,
  });
}
