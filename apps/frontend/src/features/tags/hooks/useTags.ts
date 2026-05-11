"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { tagService } from "../services/tagService";
import type {
  AttachTagInput,
  BulkSetTagsInput,
  CreateTagInput,
  UpdateTagInput,
} from "../types";

export const tagKeys = {
  library: (scope?: string) => ["tags", "library", scope ?? "all"] as const,
  object: (objectType: string, objectId: ID) =>
    ["tags", "object", objectType, objectId] as const,
};

/** Library hook — full list of tags the current Org has. */
export function useTags(scope?: string) {
  return useQuery({
    queryKey: tagKeys.library(scope),
    queryFn: () => tagService.list({ scope }),
    staleTime: 60 * 1000,
  });
}

/** Tags currently attached to a single object. */
export function useObjectTags(
  objectType: string,
  objectId: ID | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: tagKeys.object(objectType, objectId ?? ""),
    queryFn: () => tagService.listForObject(objectType, objectId!),
    enabled: enabled && !!objectId,
    staleTime: 30 * 1000,
  });
}

// ── Library mutations ────────────────────────────────────────────────

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTagInput) => tagService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags", "library"] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateTagInput }) =>
      tagService.update(id, data),
    onSuccess: () => {
      // The renamed/recolored tag may be attached to many objects — bust
      // every tag query so next render re-pulls the updated row.
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => tagService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

// ── Assignment mutations ─────────────────────────────────────────────

export function useAttachTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AttachTagInput) => tagService.attach(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tagKeys.object(variables.objectType, variables.objectId),
      });
    },
  });
}

export function useDetachTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AttachTagInput) => tagService.detach(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tagKeys.object(variables.objectType, variables.objectId),
      });
    },
  });
}

export function useBulkSetTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkSetTagsInput) => tagService.bulkSet(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: tagKeys.object(variables.objectType, variables.objectId),
      });
    },
  });
}
