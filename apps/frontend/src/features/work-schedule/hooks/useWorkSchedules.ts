"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { workScheduleService } from "../services/workScheduleService";
import type {
  CreateWorkScheduleInput,
  UpdateWorkScheduleInput,
} from "../types";

export const workScheduleKeys = {
  list: ["work-schedules", "list"] as const,
  detail: (id: ID) => ["work-schedules", "detail", id] as const,
};

export function useWorkSchedules() {
  return useQuery({
    queryKey: workScheduleKeys.list,
    queryFn: () => workScheduleService.list(),
    staleTime: 60 * 1000,
  });
}

export function useWorkSchedule(id: ID | null) {
  return useQuery({
    queryKey: id ? workScheduleKeys.detail(id) : ["work-schedules", "detail", "none"],
    queryFn: () => workScheduleService.getById(id as ID),
    enabled: !!id,
  });
}

export function useCreateWorkSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkScheduleInput) => workScheduleService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
    },
  });
}

export function useUpdateWorkSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateWorkScheduleInput }) =>
      workScheduleService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
    },
  });
}

export function useDeleteWorkSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => workScheduleService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules"] });
    },
  });
}
