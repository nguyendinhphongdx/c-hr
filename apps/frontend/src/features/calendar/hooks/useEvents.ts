"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { eventService } from "../services/eventService";
import type {
  AttendeeResponse,
  CreateEventInput,
  ListEventsQuery,
  UpdateEventInput,
} from "../types";

export const eventKeys = {
  range: (q: ListEventsQuery) => ["events", "range", q] as const,
  detail: (id: ID) => ["events", "detail", id] as const,
};

export function useEvents(query: ListEventsQuery) {
  return useQuery({
    queryKey: eventKeys.range(query),
    queryFn: () => eventService.list(query),
    staleTime: 15 * 1000,
  });
}

export function useEvent(id: ID | null) {
  return useQuery({
    queryKey: id ? eventKeys.detail(id) : ["events", "detail", "none"],
    queryFn: () => eventService.getById(id as ID),
    enabled: !!id,
  });
}

function invalidateEvents(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["events"] });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEventInput) => eventService.create(data),
    onSuccess: () => invalidateEvents(qc),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateEventInput }) =>
      eventService.update(id, data),
    onSuccess: () => invalidateEvents(qc),
  });
}

export function useCancelEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => eventService.cancel(id),
    onSuccess: () => invalidateEvents(qc),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => eventService.remove(id),
    onSuccess: () => invalidateEvents(qc),
  });
}

export function useRespondEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, response }: { id: ID; response: AttendeeResponse }) =>
      eventService.respond(id, response),
    onSuccess: () => invalidateEvents(qc),
  });
}
