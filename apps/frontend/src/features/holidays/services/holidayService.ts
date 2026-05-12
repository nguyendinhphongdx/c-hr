import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateHolidayInput,
  Holiday,
  ListHolidaysQuery,
  UpdateHolidayInput,
} from "../types";

export const holidayService = {
  list: async (query: ListHolidaysQuery = {}): Promise<Holiday[]> => {
    const params: Record<string, unknown> = {};
    if (query.year !== undefined) params.year = query.year;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;
    const res = await apiClient.get<Holiday[]>("/attendance/holidays", {
      params,
    });
    return res.data;
  },

  create: async (data: CreateHolidayInput): Promise<Holiday> => {
    const res = await apiClient.post<Holiday>("/attendance/holidays", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateHolidayInput): Promise<Holiday> => {
    const res = await apiClient.patch<Holiday>(
      `/attendance/holidays/${id}`,
      data,
    );
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/attendance/holidays/${id}`,
    );
    return res.data;
  },
};
