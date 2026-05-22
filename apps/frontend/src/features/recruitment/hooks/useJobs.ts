"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ID } from "@/lib/types";

import { jobService } from "../services/jobService";
import type {
  CreateJobInput,
  ListJobsQuery,
  UpdateJobInput,
} from "../types";

export const jobKeys = {
  all: ["jobs"] as const,
  list: (q: ListJobsQuery) => [...jobKeys.all, "list", q] as const,
  detail: (idOrSlug: string) => [...jobKeys.all, "detail", idOrSlug] as const,
};

export function useJobs(query: ListJobsQuery = {}, enabled = true) {
  return useQuery({
    queryKey: jobKeys.list(query),
    queryFn: () => jobService.list(query),
    enabled,
    staleTime: 30_000,
  });
}

export function useJob(idOrSlug: string | null) {
  return useQuery({
    queryKey: jobKeys.detail(idOrSlug ?? ""),
    queryFn: () => jobService.getByIdOrSlug(idOrSlug!),
    enabled: !!idOrSlug,
    staleTime: 30_000,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobInput) => jobService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.all });
      toast.success("Đã tạo job");
    },
    onError: (err: Error) => {
      toast.error("Không tạo được job", { description: err.message });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateJobInput }) =>
      jobService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobKeys.all }),
    onError: (err: Error) => {
      toast.error("Không cập nhật được job", { description: err.message });
    },
  });
}

export function useJobTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: ID;
      action: "publish" | "pause" | "close";
    }) => jobService[action](id),
    onSuccess: () => qc.invalidateQueries({ queryKey: jobKeys.all }),
    onError: (err: Error) => {
      toast.error("Không đổi trạng thái được", { description: err.message });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => jobService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: jobKeys.all });
      toast.success("Đã xoá job");
    },
    onError: (err: Error) => {
      toast.error("Không xoá được job", { description: err.message });
    },
  });
}
