import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateResourceInput,
  ListResourcesQuery,
  ResourceRow,
  UpdateResourceInput,
} from "../types";

export const resourceService = {
  list: async (query: ListResourcesQuery = {}): Promise<ResourceRow[]> => {
    const params: Record<string, unknown> = {};
    if (query.kind) params.kind = query.kind;
    if (query.q) params.q = query.q;
    if (query.activeOnly !== undefined) params.activeOnly = query.activeOnly;
    const res = await apiClient.get<ResourceRow[]>("/resources", { params });
    return res.data;
  },

  getById: async (id: ID): Promise<ResourceRow> => {
    const res = await apiClient.get<ResourceRow>(`/resources/${id}`);
    return res.data;
  },

  create: async (data: CreateResourceInput): Promise<ResourceRow> => {
    const res = await apiClient.post<ResourceRow>("/resources", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateResourceInput): Promise<ResourceRow> => {
    const res = await apiClient.patch<ResourceRow>(`/resources/${id}`, data);
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/resources/${id}`,
    );
    return res.data;
  },
};
