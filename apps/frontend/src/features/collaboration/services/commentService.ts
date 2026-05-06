import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CommentDto,
  CreateCommentInput,
  ListCommentsOptions,
  UpdateCommentInput,
} from "../types";

function buildListQuery(token: string, opts: ListCommentsOptions): string {
  const params = new URLSearchParams();
  params.set("token", token);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  return params.toString();
}

export const commentService = {
  list: async (
    objectRef: string,
    opts: ListCommentsOptions = {},
  ): Promise<CommentDto[]> => {
    const res = await apiClient.get<CommentDto[]>(
      `/comments?${buildListQuery(objectRef, opts)}`,
    );
    return res.data;
  },

  create: async (
    objectRef: string,
    input: CreateCommentInput,
  ): Promise<CommentDto> => {
    const res = await apiClient.post<CommentDto>("/comments", {
      token: objectRef,
      ...input,
    });
    return res.data;
  },

  update: async (commentId: ID, input: UpdateCommentInput): Promise<CommentDto> => {
    const res = await apiClient.patch<CommentDto>(`/comments/${commentId}`, input);
    return res.data;
  },

  remove: async (commentId: ID): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`);
  },
};
