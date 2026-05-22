import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  Application,
  CreateApplicationInput,
  HireApplicationInput,
  ListApplicationsQuery,
  MoveStageInput,
  RejectApplicationInput,
} from "../types";

export const applicationService = {
  list: async (
    query: ListApplicationsQuery = {},
  ): Promise<Application[]> => {
    const params: Record<string, unknown> = {};
    if (query.jobId) params.jobId = query.jobId;
    if (query.candidateId) params.candidateId = query.candidateId;
    if (query.stageId) params.stageId = query.stageId;
    const res = await apiClient.get<Application[]>("/applications", {
      params,
    });
    return res.data;
  },

  get: async (id: ID): Promise<Application> => {
    const res = await apiClient.get<Application>(`/applications/${id}`);
    return res.data;
  },

  create: async (data: CreateApplicationInput): Promise<Application> => {
    const res = await apiClient.post<Application>("/applications", data);
    return res.data;
  },

  moveStage: async (
    id: ID,
    data: MoveStageInput,
  ): Promise<Application> => {
    const res = await apiClient.post<Application>(
      `/applications/${id}/move-stage`,
      data,
    );
    return res.data;
  },

  reject: async (
    id: ID,
    data: RejectApplicationInput = {},
  ): Promise<Application> => {
    const res = await apiClient.post<Application>(
      `/applications/${id}/reject`,
      data,
    );
    return res.data;
  },

  withdraw: async (id: ID): Promise<Application> => {
    const res = await apiClient.post<Application>(
      `/applications/${id}/withdraw`,
    );
    return res.data;
  },

  hire: async (id: ID, data: HireApplicationInput): Promise<Application> => {
    const res = await apiClient.post<Application>(
      `/applications/${id}/hire`,
      data,
    );
    return res.data;
  },
};
