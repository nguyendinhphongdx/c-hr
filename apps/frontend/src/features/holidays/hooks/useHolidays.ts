"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { holidayService } from "../services/holidayService";
import type {
  CreateHolidayInput,
  ListHolidaysQuery,
  UpdateHolidayInput,
} from "../types";

export const holidayKeys = {
  all: ["holidays"] as const,
  list: (q: ListHolidaysQuery) => ["holidays", "list", q] as const,
};

export function useHolidays(query: ListHolidaysQuery) {
  return useQuery({
    queryKey: holidayKeys.list(query),
    queryFn: () => holidayService.list(query),
    staleTime: 60 * 1000,
  });
}

/**
 * Holiday mutations invalidate both the holiday list AND the timesheet
 * report keys — adding/removing a holiday flips OT bucket classification
 * for any overlapping period, so cached summary rows must be refetched.
 */
function bustHolidayAndTimesheet(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: holidayKeys.all });
  qc.invalidateQueries({ queryKey: ["timesheet-reports"] });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHolidayInput) => holidayService.create(data),
    onSuccess: () => bustHolidayAndTimesheet(qc),
  });
}

export function useUpdateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateHolidayInput }) =>
      holidayService.update(id, data),
    onSuccess: () => bustHolidayAndTimesheet(qc),
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => holidayService.remove(id),
    onSuccess: () => bustHolidayAndTimesheet(qc),
  });
}
