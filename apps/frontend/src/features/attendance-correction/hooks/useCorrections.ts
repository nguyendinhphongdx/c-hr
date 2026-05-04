"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { attendanceCorrectionService } from "../services/attendanceCorrectionService";
import type {
  CreateAttendanceCorrectionInput,
  DecideCorrectionInput,
  ListCorrectionsQuery,
} from "../types";

export const correctionKeys = {
  list: (query: ListCorrectionsQuery = {}) =>
    ["attendance-corrections", "list", query] as const,
  detail: (id: ID) => ["attendance-corrections", "detail", id] as const,
};

export function useCorrections(query: ListCorrectionsQuery = {}) {
  return useQuery({
    queryKey: correctionKeys.list(query),
    queryFn: () => attendanceCorrectionService.list(query),
    staleTime: 30 * 1000,
  });
}

export function useCorrection(id: ID | null) {
  return useQuery({
    queryKey: id
      ? correctionKeys.detail(id)
      : ["attendance-corrections", "detail", "none"],
    queryFn: () => attendanceCorrectionService.getById(id as ID),
    enabled: !!id,
  });
}

export function useCreateCorrection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAttendanceCorrectionInput) =>
      attendanceCorrectionService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-corrections"] });
    },
  });
}

export function useApproveCorrection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data?: DecideCorrectionInput }) =>
      attendanceCorrectionService.approve(id, data),
    onSuccess: () => {
      // Approving creates/updates an AttendanceLog, so invalidate timesheet too.
      queryClient.invalidateQueries({ queryKey: ["attendance-corrections"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet"] });
    },
  });
}

export function useRejectCorrection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: DecideCorrectionInput }) =>
      attendanceCorrectionService.reject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-corrections"] });
    },
  });
}

export function useCancelCorrection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => attendanceCorrectionService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-corrections"] });
    },
  });
}
