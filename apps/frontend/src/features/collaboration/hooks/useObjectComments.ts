"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { commentService } from "../services/commentService";
import type {
  CreateCommentInput,
  ListCommentsOptions,
  UpdateCommentInput,
} from "../types";

export const commentsKeys = {
  list: (objectRef: string, opts: ListCommentsOptions = {}) =>
    ["comments", objectRef, opts] as const,
  scope: (objectRef: string) => ["comments", objectRef] as const,
};

export function useObjectComments(
  objectRef: string | null,
  opts: ListCommentsOptions = {},
) {
  return useQuery({
    queryKey: objectRef
      ? commentsKeys.list(objectRef, opts)
      : ["comments", "none"],
    queryFn: () => commentService.list(objectRef as string, opts),
    enabled: !!objectRef,
    staleTime: 15 * 1000,
  });
}

export function useCreateComment(objectRef: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      commentService.create(objectRef, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentsKeys.scope(objectRef),
      });
      // CommentService auto-emits a *.commented activity on the BE.
      queryClient.invalidateQueries({
        queryKey: ["activities", objectRef],
      });
    },
  });
}

export function useUpdateComment(objectRef: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateCommentInput }) =>
      commentService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentsKeys.scope(objectRef),
      });
    },
  });
}

export function useDeleteComment(objectRef: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => commentService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentsKeys.scope(objectRef),
      });
    },
  });
}
