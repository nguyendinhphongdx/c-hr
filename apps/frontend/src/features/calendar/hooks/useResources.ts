"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { resourceService } from "../services/resourceService";
import type {
  CreateResourceInput,
  ListResourcesQuery,
  UpdateResourceInput,
} from "../types";

export const resourceKeys = {
  list: (q: ListResourcesQuery = {}) => ["resources", "list", q] as const,
  detail: (id: ID) => ["resources", "detail", id] as const,
};

export function useResources(query: ListResourcesQuery = {}) {
  return useQuery({
    queryKey: resourceKeys.list(query),
    queryFn: () => resourceService.list(query),
    staleTime: 60 * 1000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["resources"] });
}

export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateResourceInput) => resourceService.create(data),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateResourceInput }) =>
      resourceService.update(id, data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => resourceService.remove(id),
    onSuccess: () => invalidate(qc),
  });
}
