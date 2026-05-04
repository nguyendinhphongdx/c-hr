import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateRequestInput,
  DecideRequestInput,
  ListRequestsQuery,
  RequestGroup,
  RequestRow,
} from "../types";

export const requestService = {
  listGroups: async (): Promise<RequestGroup[]> => {
    const res = await apiClient.get<RequestGroup[]>("/request-groups");
    return res.data;
  },

  list: async (query: ListRequestsQuery = {}): Promise<RequestRow[]> => {
    const res = await apiClient.get<RequestRow[]>("/requests", {
      params: query,
    });
    return res.data;
  },

  getById: async (id: ID): Promise<RequestRow> => {
    const res = await apiClient.get<RequestRow>(`/requests/${id}`);
    return res.data;
  },

  create: async (data: CreateRequestInput): Promise<RequestRow> => {
    const res = await apiClient.post<RequestRow>("/requests", data);
    return res.data;
  },

  approve: async (
    id: ID,
    data: DecideRequestInput = {},
  ): Promise<RequestRow> => {
    const res = await apiClient.post<RequestRow>(`/requests/${id}/approve`, data);
    return res.data;
  },

  reject: async (id: ID, data: DecideRequestInput): Promise<RequestRow> => {
    const res = await apiClient.post<RequestRow>(`/requests/${id}/reject`, data);
    return res.data;
  },

  cancel: async (id: ID): Promise<RequestRow> => {
    const res = await apiClient.post<RequestRow>(`/requests/${id}/cancel`, {});
    return res.data;
  },
};
