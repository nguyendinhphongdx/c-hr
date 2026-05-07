import { apiClient } from "@/lib/api/client";

import type { FreeBusyQuery, FreeBusyRow } from "../types";

export const freeBusyService = {
  query: async ({
    userIds,
    from,
    to,
  }: FreeBusyQuery): Promise<FreeBusyRow[]> => {
    if (userIds.length === 0) return [];
    const res = await apiClient.get<FreeBusyRow[]>("/events/free-busy", {
      params: {
        userIds: userIds.join(","),
        from,
        to,
      },
    });
    return res.data;
  },
};
