import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateTaskInput,
  ListTasksQuery,
  ReorderTasksInput,
  TaskDetail,
  TaskListItem,
  UpdateTaskInput,
} from "../types";

export const taskService = {
  list: async (query: ListTasksQuery = {}): Promise<TaskListItem[]> => {
    const params: Record<string, unknown> = {};
    if (query.projectId) params.projectId = query.projectId;
    if (query.sectionId) params.sectionId = query.sectionId;
    if (query.status) params.status = query.status;
    if (query.assigneeId) params.assigneeId = query.assigneeId;
    if (query.q) params.q = query.q;
    if (query.includeDone) params.includeDone = "true";
    const res = await apiClient.get<TaskListItem[]>("/tasks", { params });
    return res.data;
  },

  getByIdOrCode: async (idOrCode: string): Promise<TaskDetail> => {
    const res = await apiClient.get<TaskDetail>(
      `/tasks/${encodeURIComponent(idOrCode)}`,
    );
    return res.data;
  },

  create: async (data: CreateTaskInput): Promise<TaskDetail> => {
    const res = await apiClient.post<TaskDetail>("/tasks", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateTaskInput): Promise<TaskDetail> => {
    const res = await apiClient.patch<TaskDetail>(`/tasks/${id}`, data);
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/tasks/${id}`,
    );
    return res.data;
  },

  reorder: async (
    projectId: ID,
    sectionId: ID,
    data: ReorderTasksInput,
  ): Promise<{ success: true }> => {
    const res = await apiClient.put<{ success: true }>(
      `/projects/${projectId}/sections/${sectionId}/order`,
      data,
    );
    return res.data;
  },

  watch: async (id: ID): Promise<{ success: true }> => {
    const res = await apiClient.post<{ success: true }>(
      `/tasks/${id}/watch`,
      {},
    );
    return res.data;
  },

  unwatch: async (id: ID): Promise<{ success: true }> => {
    const res = await apiClient.delete<{ success: true }>(
      `/tasks/${id}/watch`,
    );
    return res.data;
  },
};
