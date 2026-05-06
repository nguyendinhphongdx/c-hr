"use client";

import { useQuery } from "@tanstack/react-query";

import { activityService } from "../services/activityService";
import type { ListActivitiesOptions } from "../types";

export const activitiesKeys = {
  list: (objectRef: string, opts: ListActivitiesOptions = {}) =>
    ["activities", objectRef, opts] as const,
  scope: (objectRef: string) => ["activities", objectRef] as const,
};

export function useObjectActivities(
  objectRef: string | null,
  opts: ListActivitiesOptions = {},
) {
  return useQuery({
    queryKey: objectRef
      ? activitiesKeys.list(objectRef, opts)
      : ["activities", "none"],
    queryFn: () => activityService.list(objectRef as string, opts),
    enabled: !!objectRef,
    staleTime: 15 * 1000,
  });
}
