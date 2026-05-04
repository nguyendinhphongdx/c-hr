"use client";

import { useQuery } from "@tanstack/react-query";

import { usersService } from "../services/usersService";
import type { ListOrgUsersQuery } from "../types";

export const orgUsersKeys = {
  list: (query: ListOrgUsersQuery) => ["users", "list", query] as const,
};

export function useOrgUsers(query: ListOrgUsersQuery = {}) {
  return useQuery({
    queryKey: orgUsersKeys.list(query),
    queryFn: () => usersService.list(query),
    staleTime: 30 * 1000,
  });
}
