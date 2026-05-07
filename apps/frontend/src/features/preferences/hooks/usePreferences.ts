"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authKeys } from "@/features/auth";

import { preferencesService } from "../services/preferencesService";

export const preferencesKeys = {
  all: ["preferences"] as const,
};

/** Bulk USER-scope preferences. The same map is also embedded on /me, so
 *  most callers can read from `useAuth().user.preferences` directly. */
export function usePreferences() {
  return useQuery({
    queryKey: preferencesKeys.all,
    queryFn: preferencesService.get,
    staleTime: 5 * 60 * 1000,
  });
}

interface UpdatePreferenceInput {
  key: string;
  value: unknown;
}

export function useUpdatePreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: UpdatePreferenceInput) =>
      preferencesService.set(key, value),
    onSuccess: () => {
      // Refresh both caches: standalone preferences query + the /me
      // response that also embeds them.
      queryClient.invalidateQueries({ queryKey: preferencesKeys.all });
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}
