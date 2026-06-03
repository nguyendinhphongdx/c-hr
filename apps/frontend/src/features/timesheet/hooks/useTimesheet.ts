"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { timesheetService } from "../services/timesheetService";

export const timesheetKeys = {
  month: (employeeId: ID, year: number, month: number) =>
    ["timesheet", employeeId, year, month] as const,
};

export function useTimesheet(
  employeeId: ID | null,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: employeeId
      ? timesheetKeys.month(employeeId, year, month)
      : ["timesheet", "none"],
    queryFn: () =>
      timesheetService.get({ employeeId: employeeId as ID, year, month }),
    enabled: !!employeeId,
    staleTime: 30 * 1000,
    // Keep the prior month/employee's grid visible while refetching so
    // the page doesn't flicker on month-nav or employee-switch. The
    // consumer uses `isPlaceholderData` to dim the stale view.
    placeholderData: keepPreviousData,
  });
}
