"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ID } from "@/lib/types";

import { candidateService } from "../services/candidateService";
import type {
  CreateCandidateInput,
  ListCandidatesQuery,
  UpdateCandidateInput,
} from "../types";

export const candidateKeys = {
  all: ["candidates"] as const,
  list: (q: ListCandidatesQuery) => [...candidateKeys.all, "list", q] as const,
  detail: (id: ID) => [...candidateKeys.all, "detail", id] as const,
};

export function useCandidates(
  query: ListCandidatesQuery = {},
  enabled = true,
) {
  return useQuery({
    queryKey: candidateKeys.list(query),
    queryFn: () => candidateService.list(query),
    enabled,
    staleTime: 30_000,
  });
}

export function useCandidate(id: ID | null) {
  return useQuery({
    queryKey: candidateKeys.detail(id ?? ""),
    queryFn: () => candidateService.get(id!),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCandidateInput) => candidateService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: candidateKeys.all });
      toast.success("Đã thêm ứng viên");
    },
    onError: (err: Error) => {
      toast.error("Không tạo được ứng viên", { description: err.message });
    },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateCandidateInput }) =>
      candidateService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: candidateKeys.all }),
    onError: (err: Error) => {
      toast.error("Không cập nhật được ứng viên", { description: err.message });
    },
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => candidateService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: candidateKeys.all });
      toast.success("Đã xoá ứng viên");
    },
    onError: (err: Error) => {
      toast.error("Không xoá được ứng viên", { description: err.message });
    },
  });
}
