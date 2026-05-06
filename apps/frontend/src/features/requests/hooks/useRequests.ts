"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { requestService } from "../services/requestService";
import type {
  CreateRequestInput,
  DecideRequestInput,
  ListRequestsQuery,
  UpdateRequestInput,
} from "../types";

export const requestKeys = {
  groups: ["requests", "groups"] as const,
  list: (query: ListRequestsQuery = {}) =>
    ["requests", "list", query] as const,
  detail: (id: ID) => ["requests", "detail", id] as const,
};

export function useRequestGroups() {
  return useQuery({
    queryKey: requestKeys.groups,
    queryFn: () => requestService.listGroups(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRequests(query: ListRequestsQuery = {}) {
  return useQuery({
    queryKey: requestKeys.list(query),
    queryFn: () => requestService.list(query),
    staleTime: 30 * 1000,
  });
}

export function useRequest(id: ID | null) {
  return useQuery({
    queryKey: id ? requestKeys.detail(id) : ["requests", "detail", "none"],
    queryFn: () => requestService.getById(id as ID),
    enabled: !!id,
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRequestInput) => requestService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function useUpdateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: ID; body: UpdateRequestInput }) =>
      requestService.update(id, body),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(row.id) });
    },
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data?: DecideRequestInput }) =>
      requestService.approve(id, data),
    onSuccess: () => {
      // Approving a checkin/checkout writes an attendance_log row, so
      // invalidate timesheet too — the user might be looking at it.
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      queryClient.invalidateQueries({ queryKey: ["timesheet"] });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: DecideRequestInput }) =>
      requestService.reject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => requestService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
    },
  });
}
