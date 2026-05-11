import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  AttachTagInput,
  BulkSetTagsInput,
  CreateTagInput,
  ListTagsQuery,
  Tag,
  TagAssignment,
  UpdateTagInput,
} from "../types";

export const tagService = {
  list: async (query: ListTagsQuery = {}): Promise<Tag[]> => {
    const params: Record<string, unknown> = {};
    if (query.scope !== undefined) params.scope = query.scope;
    if (query.q) params.q = query.q;
    const res = await apiClient.get<Tag[]>("/tags", { params });
    return res.data;
  },

  create: async (data: CreateTagInput): Promise<Tag> => {
    const res = await apiClient.post<Tag>("/tags", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateTagInput): Promise<Tag> => {
    const res = await apiClient.patch<Tag>(`/tags/${id}`, data);
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/tags/${id}`,
    );
    return res.data;
  },

  listForObject: async (objectType: string, objectId: ID): Promise<Tag[]> => {
    const res = await apiClient.get<Tag[]>("/tag-assignments", {
      params: { objectType, objectId },
    });
    return res.data;
  },

  attach: async (data: AttachTagInput): Promise<TagAssignment> => {
    const res = await apiClient.post<TagAssignment>("/tag-assignments", data);
    return res.data;
  },

  detach: async (
    data: AttachTagInput,
  ): Promise<{ success: true; removed: number }> => {
    const res = await apiClient.delete<{ success: true; removed: number }>(
      "/tag-assignments",
      { params: data },
    );
    return res.data;
  },

  bulkSet: async (data: BulkSetTagsInput): Promise<TagAssignment[]> => {
    const res = await apiClient.put<TagAssignment[]>(
      "/tag-assignments/bulk",
      data,
    );
    return res.data;
  },
};
