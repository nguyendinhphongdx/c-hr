import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  AttendeeResponse,
  CreateEventInput,
  EventDetail,
  EventRow,
  ListEventsQuery,
  UpdateEventInput,
} from "../types";

export const eventService = {
  list: async (query: ListEventsQuery): Promise<EventRow[]> => {
    const params: Record<string, unknown> = {
      from: query.from,
      to: query.to,
    };
    if (query.scope) params.scope = query.scope;
    if (query.userIds?.length) params.userIds = query.userIds.join(",");
    const res = await apiClient.get<EventRow[]>("/events", { params });
    return res.data;
  },

  getById: async (id: ID): Promise<EventDetail> => {
    const res = await apiClient.get<EventDetail>(`/events/${id}`);
    return res.data;
  },

  create: async (data: CreateEventInput): Promise<EventDetail> => {
    const res = await apiClient.post<EventDetail>("/events", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateEventInput): Promise<EventDetail> => {
    const res = await apiClient.patch<EventDetail>(`/events/${id}`, data);
    return res.data;
  },

  cancel: async (id: ID): Promise<EventDetail> => {
    const res = await apiClient.post<EventDetail>(`/events/${id}/cancel`, {});
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/events/${id}`,
    );
    return res.data;
  },

  respond: async (
    id: ID,
    response: AttendeeResponse,
  ): Promise<EventDetail> => {
    const res = await apiClient.post<EventDetail>(`/events/${id}/respond`, {
      response,
    });
    return res.data;
  },
};
