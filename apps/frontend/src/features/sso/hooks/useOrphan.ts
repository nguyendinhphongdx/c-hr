"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { orphanService } from "../services/orphanService";
import type { SubmitJoinRequestInput } from "../types";

export const orphanKeys = {
  me: ["sso", "orphan", "me"] as const,
  suggested: ["sso", "orphan", "suggested"] as const,
  search: (q: string) => ["sso", "orphan", "search", q] as const,
};

export function useOrphanProfile() {
  return useQuery({
    queryKey: orphanKeys.me,
    queryFn: () => orphanService.me(),
    retry: false,
    staleTime: 60 * 1000,
  });
}

export function useSuggestedOrgs(enabled: boolean) {
  return useQuery({
    queryKey: orphanKeys.suggested,
    queryFn: () => orphanService.suggestedOrgs(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchOrgs(q: string, enabled: boolean) {
  return useQuery({
    queryKey: orphanKeys.search(q),
    queryFn: () => orphanService.searchOrgs(q),
    enabled: enabled && q.trim().length >= 2,
    staleTime: 30 * 1000,
  });
}

export function useSubmitJoinRequest() {
  return useMutation({
    mutationFn: (input: SubmitJoinRequestInput) =>
      orphanService.submitJoinRequest(input),
  });
}

export function useClearOrphan() {
  return useMutation({
    mutationFn: () => orphanService.clear(),
  });
}
