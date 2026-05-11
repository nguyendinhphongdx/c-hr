"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { planService } from "../services/planService";
import type {
  AddTaskInput,
  CreatePlanInput,
  ListPlansQuery,
} from "../types";

export const onboardingPlanKeys = {
  all: ["onboarding", "plans"] as const,
  list: (query: ListPlansQuery) =>
    ["onboarding", "plans", "list", query] as const,
  detail: (id: ID) => ["onboarding", "plans", "detail", id] as const,
  byEmployee: (employeeId: ID) =>
    ["onboarding", "plans", "by-employee", employeeId] as const,
};

export function useOnboardingPlans(query: ListPlansQuery = {}) {
  // BE accepts status + employeeId; `q` is filtered client-side so it
  // doesn't reach the service or the query key.
  const serverQuery: ListPlansQuery = {};
  if (query.status) serverQuery.status = query.status;
  if (query.employeeId) serverQuery.employeeId = query.employeeId;
  return useQuery({
    queryKey: onboardingPlanKeys.list(serverQuery),
    queryFn: () => planService.list(serverQuery),
    staleTime: 15 * 1000,
  });
}

export function usePlan(id: ID | undefined) {
  return useQuery({
    queryKey: onboardingPlanKeys.detail(id ?? ""),
    queryFn: () => planService.get(id!),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

export function usePlanByEmployee(employeeId: ID | undefined) {
  return useQuery({
    queryKey: onboardingPlanKeys.byEmployee(employeeId ?? ""),
    queryFn: () => planService.getByEmployee(employeeId!),
    enabled: !!employeeId,
    staleTime: 15 * 1000,
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlanInput) => planService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingPlanKeys.all });
    },
  });
}

export function useArchivePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => planService.archive(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: onboardingPlanKeys.all });
      qc.invalidateQueries({ queryKey: onboardingPlanKeys.detail(id) });
    },
  });
}

export function useDeletePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => planService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: onboardingPlanKeys.all });
    },
  });
}

export function useAddPlanTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, data }: { planId: ID; data: AddTaskInput }) =>
      planService.addTask(planId, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: onboardingPlanKeys.detail(vars.planId) });
      qc.invalidateQueries({ queryKey: onboardingPlanKeys.all });
    },
  });
}
