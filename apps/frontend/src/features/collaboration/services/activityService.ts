import { apiClient } from "@/lib/api/client";

import type { ActivityDto, ListActivitiesOptions } from "../types";

function buildListQuery(token: string, opts: ListActivitiesOptions): string {
  const params = new URLSearchParams();
  params.set("token", token);
  if (opts.limit != null) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  return params.toString();
}

export const activityService = {
  list: async (
    objectRef: string,
    opts: ListActivitiesOptions = {},
  ): Promise<ActivityDto[]> => {
    const res = await apiClient.get<ActivityDto[]>(
      `/activities?${buildListQuery(objectRef, opts)}`,
    );
    return res.data;
  },
};
