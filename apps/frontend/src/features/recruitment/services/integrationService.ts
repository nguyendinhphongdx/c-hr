import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  JobBoard,
  JobBoardIntegration,
  JobBoardPosting,
  UpsertIntegrationInput,
} from "../types";

export const integrationService = {
  list: async (): Promise<JobBoardIntegration[]> => {
    const res = await apiClient.get<JobBoardIntegration[]>(
      "/recruitment/integrations",
    );
    return res.data;
  },

  upsert: async (
    data: UpsertIntegrationInput,
  ): Promise<JobBoardIntegration> => {
    const res = await apiClient.put<JobBoardIntegration>(
      "/recruitment/integrations",
      data,
    );
    return res.data;
  },

  toggle: async (board: JobBoard): Promise<JobBoardIntegration> => {
    const res = await apiClient.post<JobBoardIntegration>(
      `/recruitment/integrations/${board}/toggle`,
    );
    return res.data;
  },

  remove: async (board: JobBoard): Promise<{ success: true }> => {
    const res = await apiClient.delete<{ success: true }>(
      `/recruitment/integrations/${board}`,
    );
    return res.data;
  },

  listPostings: async (jobId: ID): Promise<JobBoardPosting[]> => {
    const res = await apiClient.get<JobBoardPosting[]>(
      `/jobs/${jobId}/postings`,
    );
    return res.data;
  },

  pushJob: async (
    jobId: ID,
    board: JobBoard,
  ): Promise<JobBoardPosting> => {
    const res = await apiClient.post<JobBoardPosting>(
      `/jobs/${jobId}/postings/push`,
      { board },
    );
    return res.data;
  },

  closePosting: async (
    jobId: ID,
    board: JobBoard,
  ): Promise<JobBoardPosting> => {
    const res = await apiClient.post<JobBoardPosting>(
      `/jobs/${jobId}/postings/close`,
      { board },
    );
    return res.data;
  },
};
