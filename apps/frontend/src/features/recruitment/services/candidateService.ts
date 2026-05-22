import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  Candidate,
  CreateCandidateInput,
  ListCandidatesQuery,
  UpdateCandidateInput,
} from "../types";

export const candidateService = {
  list: async (query: ListCandidatesQuery = {}): Promise<Candidate[]> => {
    const params: Record<string, unknown> = {};
    if (query.source) params.source = query.source;
    if (query.q) params.q = query.q;
    const res = await apiClient.get<Candidate[]>("/candidates", { params });
    return res.data;
  },

  get: async (id: ID): Promise<Candidate> => {
    const res = await apiClient.get<Candidate>(`/candidates/${id}`);
    return res.data;
  },

  create: async (data: CreateCandidateInput): Promise<Candidate> => {
    const res = await apiClient.post<Candidate>("/candidates", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateCandidateInput): Promise<Candidate> => {
    const res = await apiClient.patch<Candidate>(`/candidates/${id}`, data);
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/candidates/${id}`,
    );
    return res.data;
  },
};
