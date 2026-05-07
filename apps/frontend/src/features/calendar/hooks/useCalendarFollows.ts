"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import {
  type CreateCalendarFollowInput,
  followService,
} from "../services/followService";

export const calendarFollowKeys = {
  list: ["calendar-follows"] as const,
  followers: ["calendar-followers"] as const,
};

/** Who I'm following. */
export function useCalendarFollows() {
  return useQuery({
    queryKey: calendarFollowKeys.list,
    queryFn: () => followService.list(),
    staleTime: 60 * 1000,
  });
}

/** Who follows me. */
export function useCalendarFollowers() {
  return useQuery({
    queryKey: calendarFollowKeys.followers,
    queryFn: () => followService.listFollowers(),
    staleTime: 60 * 1000,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: calendarFollowKeys.list });
  qc.invalidateQueries({ queryKey: calendarFollowKeys.followers });
}

export function useCreateCalendarFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCalendarFollowInput) =>
      followService.create(data),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteCalendarFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => followService.remove(id),
    onSuccess: () => invalidate(qc),
  });
}
