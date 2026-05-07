"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { ID } from "@/lib/types";

import { freeBusyService } from "../services/freeBusyService";
import type { FreeBusyRow } from "../types";

export const freeBusyKeys = {
  query: (userIds: ID[], from: string | null, to: string | null) =>
    [
      "free-busy",
      [...userIds].sort().join(","),
      from ?? "",
      to ?? "",
    ] as const,
};

interface UseFreeBusyParams {
  userIds: ID[];
  from: string | null;
  to: string | null;
  enabled?: boolean;
}

/**
 * Returns free/busy rows for the given users + slot. Result also exposed
 * as a `byUserId` Map for ergonomic per-row lookup in attendee pickers.
 *
 * Disabled (no fetch) when no users, no slot, or `enabled=false`.
 */
export function useFreeBusy({
  userIds,
  from,
  to,
  enabled = true,
}: UseFreeBusyParams) {
  const sortedIds = useMemo(() => [...userIds].sort(), [userIds]);

  const query = useQuery({
    queryKey: freeBusyKeys.query(sortedIds, from, to),
    queryFn: () =>
      freeBusyService.query({
        userIds: sortedIds,
        from: from as string,
        to: to as string,
      }),
    enabled: enabled && sortedIds.length > 0 && !!from && !!to,
    staleTime: 30 * 1000,
  });

  const byUserId = useMemo(() => {
    const map = new Map<ID, FreeBusyRow>();
    for (const row of query.data ?? []) map.set(row.userId, row);
    return map;
  }, [query.data]);

  return { ...query, byUserId };
}
