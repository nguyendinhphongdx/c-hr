import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateJobInput,
  Job,
  ListJobsQuery,
  UpdateJobInput,
} from "../types";

export const jobService = {
  list: async (query: ListJobsQuery = {}): Promise<Job[]> => {
    const params: Record<string, unknown> = {};
    if (query.status) params.status = query.status;
    if (query.departmentId) params.departmentId = query.departmentId;
    if (query.q) params.q = query.q;
    const res = await apiClient.get<Job[]>("/jobs", { params });
    return res.data;
  },

  getByIdOrSlug: async (idOrSlug: string): Promise<Job> => {
    const res = await apiClient.get<Job>(
      `/jobs/${encodeURIComponent(idOrSlug)}`,
    );
    return res.data;
  },

  create: async (data: CreateJobInput): Promise<Job> => {
    const res = await apiClient.post<Job>("/jobs", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateJobInput): Promise<Job> => {
    const res = await apiClient.patch<Job>(`/jobs/${id}`, data);
    return res.data;
  },

  publish: async (id: ID): Promise<Job> => {
    const res = await apiClient.post<Job>(`/jobs/${id}/publish`);
    return res.data;
  },

  pause: async (id: ID): Promise<Job> => {
    const res = await apiClient.post<Job>(`/jobs/${id}/pause`);
    return res.data;
  },

  close: async (id: ID): Promise<Job> => {
    const res = await apiClient.post<Job>(`/jobs/${id}/close`);
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/jobs/${id}`,
    );
    return res.data;
  },
};
