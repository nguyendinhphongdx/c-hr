"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ID } from "@/lib/types";

import { applicationService } from "../services/applicationService";
import type {
  CreateApplicationInput,
  HireApplicationInput,
  ListApplicationsQuery,
  MoveStageInput,
  RejectApplicationInput,
} from "../types";

export const applicationKeys = {
  all: ["applications"] as const,
  list: (q: ListApplicationsQuery) =>
    [...applicationKeys.all, "list", q] as const,
  detail: (id: ID) => [...applicationKeys.all, "detail", id] as const,
};

export function useApplications(
  query: ListApplicationsQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: applicationKeys.list(query),
    queryFn: () => applicationService.list(query),
    enabled,
    staleTime: 15_000,
  });
}

export function useApplication(id: ID | null) {
  return useQuery({
    queryKey: applicationKeys.detail(id ?? ""),
    queryFn: () => applicationService.get(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApplicationInput) =>
      applicationService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: applicationKeys.all });
      toast.success("Đã ghi nhận ứng tuyển");
    },
    onError: (err: Error) => {
      toast.error("Không tạo được ứng tuyển", { description: err.message });
    },
  });
}

export function useMoveApplicationStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: MoveStageInput }) =>
      applicationService.moveStage(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all }),
    onError: (err: Error) => {
      toast.error("Không di chuyển được", { description: err.message });
    },
  });
}

export function useRejectApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: ID;
      data?: RejectApplicationInput;
    }) => applicationService.reject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: applicationKeys.all });
      toast.success("Đã loại ứng viên");
    },
    onError: (err: Error) => {
      toast.error("Không loại được", { description: err.message });
    },
  });
}

export function useWithdrawApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => applicationService.withdraw(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all }),
    onError: (err: Error) => {
      toast.error("Không rút được", { description: err.message });
    },
  });
}

export function useHireApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: ID;
      data: HireApplicationInput;
    }) => applicationService.hire(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: applicationKeys.all });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Đã chuyển thành nhân viên");
    },
    onError: (err: Error) => {
      toast.error("Không tạo nhân viên được", { description: err.message });
    },
  });
}
