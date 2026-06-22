"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ssoService } from "../services/ssoService";
import type { UpsertSsoConfigInput } from "../types";

export const ssoKeys = {
  myConfig: ["sso", "configs", "me"] as const,
};

export function useSsoConfig() {
  return useQuery({
    queryKey: ssoKeys.myConfig,
    queryFn: () => ssoService.getMyConfig(),
    staleTime: 60 * 1000,
  });
}

export function useUpsertSsoConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertSsoConfigInput) => ssoService.upsertMyConfig(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ssoKeys.myConfig });
    },
  });
}

export function useDeleteSsoConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => ssoService.deleteMyConfig(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ssoKeys.myConfig });
    },
  });
}

export function useStartEntra() {
  return useMutation({
    mutationFn: ({ orgSlug, returnTo }: { orgSlug: string; returnTo?: string }) =>
      ssoService.startEntra(orgSlug, returnTo),
  });
}
