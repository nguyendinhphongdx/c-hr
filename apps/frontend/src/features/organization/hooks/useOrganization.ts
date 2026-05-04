"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authKeys } from "@/features/auth";

import {
  organizationService,
  type UpdateOrganizationInput,
} from "../services/organizationService";

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOrganizationInput) =>
      organizationService.updateMine(data),
    onSuccess: () => {
      // me query carries the embedded Organization — invalidate so the
      // Org name in the sidebar / header refreshes too.
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}
