"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { taskService } from "../services/taskService";
import type {
  CompleteTaskInput,
  ReassignTaskInput,
  UpdateTaskInput,
} from "../types";

import { onboardingPlanKeys } from "./useOnboardingPlans";

export const onboardingTaskKeys = {
  all: ["onboarding", "tasks"] as const,
  detail: (id: ID) => ["onboarding", "tasks", "detail", id] as const,
};

export function useOnboardingTask(id: ID | null | undefined) {
  return useQuery({
    queryKey: onboardingTaskKeys.detail(id ?? ""),
    queryFn: () => taskService.get(id!),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

function invalidatePlan(qc: ReturnType<typeof useQueryClient>, planId: ID) {
  qc.invalidateQueries({ queryKey: onboardingPlanKeys.detail(planId) });
  qc.invalidateQueries({ queryKey: onboardingPlanKeys.all });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateTaskInput }) =>
      taskService.update(id, data),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: onboardingTaskKeys.detail(task.id) });
      invalidatePlan(qc, task.planId);
    },
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data?: CompleteTaskInput }) =>
      taskService.complete(id, data ?? {}),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: onboardingTaskKeys.detail(task.id) });
      invalidatePlan(qc, task.planId);
    },
  });
}

export function useUncompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => taskService.uncomplete(id),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: onboardingTaskKeys.detail(task.id) });
      invalidatePlan(qc, task.planId);
    },
  });
}

export function useReassignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: ReassignTaskInput }) =>
      taskService.reassign(id, data),
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: onboardingTaskKeys.detail(task.id) });
      invalidatePlan(qc, task.planId);
    },
  });
}
