"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppCode } from "@/features/auth";
import type { ID } from "@/lib/types";

import {
  appAdminsService,
  type GrantAppAdminInput,
} from "../services/appAdminsService";

export const appAdminsKeys = {
  list: (app?: AppCode) => ["app-admins", "list", app ?? "all"] as const,
};

export function useAppAdmins(app?: AppCode) {
  return useQuery({
    queryKey: appAdminsKeys.list(app),
    queryFn: () => appAdminsService.list(app),
    staleTime: 30 * 1000,
  });
}

export function useGrantAppAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GrantAppAdminInput) => appAdminsService.grant(data),
    onSuccess: () => {
      // Invalidate every list cache; the grant might match any filter.
      queryClient.invalidateQueries({ queryKey: ["app-admins", "list"] });
    },
  });
}

export function useRevokeAppAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => appAdminsService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-admins", "list"] });
    },
  });
}
