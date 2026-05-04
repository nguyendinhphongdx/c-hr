"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { leaveRequestService } from "../services/leaveRequestService";
import type {
  CreateLeaveRequestInput,
  DecideLeaveRequestInput,
  ListLeaveRequestsQuery,
} from "../types";

export const leaveKeys = {
  list: (query: ListLeaveRequestsQuery = {}) =>
    ["leave-requests", "list", query] as const,
  detail: (id: ID) => ["leave-requests", "detail", id] as const,
};

export function useLeaveRequests(query: ListLeaveRequestsQuery = {}) {
  return useQuery({
    queryKey: leaveKeys.list(query),
    queryFn: () => leaveRequestService.list(query),
    staleTime: 30 * 1000,
  });
}

export function useLeaveRequest(id: ID | null) {
  return useQuery({
    queryKey: id ? leaveKeys.detail(id) : ["leave-requests", "detail", "none"],
    queryFn: () => leaveRequestService.getById(id as ID),
    enabled: !!id,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeaveRequestInput) =>
      leaveRequestService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data?: DecideLeaveRequestInput }) =>
      leaveRequestService.approve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: DecideLeaveRequestInput }) =>
      leaveRequestService.reject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => leaveRequestService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}
