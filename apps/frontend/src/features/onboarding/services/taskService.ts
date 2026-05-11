import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CompleteTaskInput,
  OnboardingTaskDetail,
  ReassignTaskInput,
  UpdateTaskInput,
} from "../types";

export const taskService = {
  get: async (id: ID): Promise<OnboardingTaskDetail> => {
    const res = await apiClient.get<OnboardingTaskDetail>(
      `/onboarding/tasks/${id}`,
    );
    return res.data;
  },

  update: async (
    id: ID,
    data: UpdateTaskInput,
  ): Promise<OnboardingTaskDetail> => {
    const res = await apiClient.patch<OnboardingTaskDetail>(
      `/onboarding/tasks/${id}`,
      data,
    );
    return res.data;
  },

  complete: async (
    id: ID,
    data: CompleteTaskInput = {},
  ): Promise<OnboardingTaskDetail> => {
    const res = await apiClient.post<OnboardingTaskDetail>(
      `/onboarding/tasks/${id}/complete`,
      data,
    );
    return res.data;
  },

  uncomplete: async (id: ID): Promise<OnboardingTaskDetail> => {
    const res = await apiClient.post<OnboardingTaskDetail>(
      `/onboarding/tasks/${id}/uncomplete`,
    );
    return res.data;
  },

  reassign: async (
    id: ID,
    data: ReassignTaskInput,
  ): Promise<OnboardingTaskDetail> => {
    const res = await apiClient.patch<OnboardingTaskDetail>(
      `/onboarding/tasks/${id}/reassign`,
      data,
    );
    return res.data;
  },
};
