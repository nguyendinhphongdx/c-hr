import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  AddTaskInput,
  CreatePlanInput,
  ListPlansQuery,
  OnboardingPlanDetail,
  OnboardingPlanRow,
  OnboardingTaskRow,
} from "../types";

export const planService = {
  list: async (query: ListPlansQuery = {}): Promise<OnboardingPlanRow[]> => {
    const params: Record<string, unknown> = {};
    if (query.status) params.status = query.status;
    if (query.employeeId) params.employeeId = query.employeeId;
    const res = await apiClient.get<OnboardingPlanRow[]>("/onboarding/plans", {
      params,
    });
    return res.data;
  },

  get: async (id: ID): Promise<OnboardingPlanDetail> => {
    const res = await apiClient.get<OnboardingPlanDetail>(
      `/onboarding/plans/${id}`,
    );
    return res.data;
  },

  getByEmployee: async (employeeId: ID): Promise<OnboardingPlanDetail> => {
    const res = await apiClient.get<OnboardingPlanDetail>(
      `/onboarding/plans/by-employee/${employeeId}`,
    );
    return res.data;
  },

  create: async (data: CreatePlanInput): Promise<OnboardingPlanRow> => {
    const res = await apiClient.post<OnboardingPlanRow>(
      "/onboarding/plans",
      data,
    );
    return res.data;
  },

  archive: async (id: ID): Promise<OnboardingPlanDetail> => {
    const res = await apiClient.post<OnboardingPlanDetail>(
      `/onboarding/plans/${id}/archive`,
    );
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/onboarding/plans/${id}`,
    );
    return res.data;
  },

  addTask: async (
    planId: ID,
    data: AddTaskInput,
  ): Promise<OnboardingTaskRow> => {
    const res = await apiClient.post<OnboardingTaskRow>(
      `/onboarding/plans/${planId}/tasks`,
      data,
    );
    return res.data;
  },
};
