import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateTemplateInput,
  CreateTemplateTaskInput,
  ListTemplatesQuery,
  OnboardingTemplate,
  OnboardingTemplateTask,
  ReorderTemplateTasksInput,
  UpdateTemplateInput,
  UpdateTemplateTaskInput,
} from "../types";

export const templateService = {
  list: async (
    query: ListTemplatesQuery = {},
  ): Promise<OnboardingTemplate[]> => {
    const params: Record<string, unknown> = {};
    if (query.q) params.q = query.q;
    if (query.active !== undefined) params.active = query.active;
    const res = await apiClient.get<OnboardingTemplate[]>(
      "/onboarding/templates",
      { params },
    );
    return res.data;
  },

  get: async (id: ID): Promise<OnboardingTemplate> => {
    const res = await apiClient.get<OnboardingTemplate>(
      `/onboarding/templates/${id}`,
    );
    return res.data;
  },

  create: async (data: CreateTemplateInput): Promise<OnboardingTemplate> => {
    const res = await apiClient.post<OnboardingTemplate>(
      "/onboarding/templates",
      data,
    );
    return res.data;
  },

  update: async (
    id: ID,
    data: UpdateTemplateInput,
  ): Promise<OnboardingTemplate> => {
    const res = await apiClient.patch<OnboardingTemplate>(
      `/onboarding/templates/${id}`,
      data,
    );
    return res.data;
  },

  archive: async (id: ID): Promise<OnboardingTemplate> => {
    const res = await apiClient.post<OnboardingTemplate>(
      `/onboarding/templates/${id}/archive`,
    );
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/onboarding/templates/${id}`,
    );
    return res.data;
  },

  // ─── Template tasks ───────────────────────────────────────────────

  addTask: async (
    templateId: ID,
    data: CreateTemplateTaskInput,
  ): Promise<OnboardingTemplateTask> => {
    const res = await apiClient.post<OnboardingTemplateTask>(
      `/onboarding/templates/${templateId}/tasks`,
      data,
    );
    return res.data;
  },

  updateTask: async (
    id: ID,
    data: UpdateTemplateTaskInput,
  ): Promise<OnboardingTemplateTask> => {
    const res = await apiClient.patch<OnboardingTemplateTask>(
      `/onboarding/template-tasks/${id}`,
      data,
    );
    return res.data;
  },

  reorderTasks: async (
    templateId: ID,
    data: ReorderTemplateTasksInput,
  ): Promise<OnboardingTemplateTask[]> => {
    const res = await apiClient.put<OnboardingTemplateTask[]>(
      `/onboarding/templates/${templateId}/tasks/order`,
      data,
    );
    return res.data;
  },

  deleteTask: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/onboarding/template-tasks/${id}`,
    );
    return res.data;
  },
};
