"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ID } from "@/lib/types";

import { integrationService } from "../services/integrationService";
import type { JobBoard, UpsertIntegrationInput } from "../types";

export const integrationKeys = {
  all: ["recruitment-integrations"] as const,
  postings: (jobId: ID) =>
    [...integrationKeys.all, "postings", jobId] as const,
};

export function useIntegrations(enabled = true) {
  return useQuery({
    queryKey: integrationKeys.all,
    queryFn: () => integrationService.list(),
    enabled,
    staleTime: 30_000,
  });
}

export function useUpsertIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertIntegrationInput) =>
      integrationService.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.all });
      toast.success("Đã lưu kết nối");
    },
    onError: (err: Error) => {
      toast.error("Không lưu được", { description: err.message });
    },
  });
}

export function useToggleIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (board: JobBoard) => integrationService.toggle(board),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrationKeys.all }),
    onError: (err: Error) => {
      toast.error("Không đổi trạng thái được", { description: err.message });
    },
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (board: JobBoard) => integrationService.remove(board),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: integrationKeys.all });
      toast.success("Đã xoá kết nối");
    },
    onError: (err: Error) => {
      toast.error("Không xoá được", { description: err.message });
    },
  });
}

export function useJobPostings(jobId: ID | null) {
  return useQuery({
    queryKey: integrationKeys.postings(jobId ?? ""),
    queryFn: () => integrationService.listPostings(jobId!),
    enabled: !!jobId,
    staleTime: 15_000,
  });
}

export function usePushJobToBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, board }: { jobId: ID; board: JobBoard }) =>
      integrationService.pushJob(jobId, board),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: integrationKeys.postings(vars.jobId) });
      toast.success("Đã đăng tin lên job board");
    },
    onError: (err: Error) => {
      toast.error("Đăng tin thất bại", { description: err.message });
    },
  });
}

export function useClosePostingOnBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, board }: { jobId: ID; board: JobBoard }) =>
      integrationService.closePosting(jobId, board),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: integrationKeys.postings(vars.jobId) });
      toast.success("Đã đóng tin trên job board");
    },
    onError: (err: Error) => {
      toast.error("Đóng tin thất bại", { description: err.message });
    },
  });
}
