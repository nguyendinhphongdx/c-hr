import { apiClient } from "@/lib/api/client";
import type { ID, ISODate, Nullable } from "@/lib/types";

export interface FollowEmployeeSummary {
  id: ID;
  code: string;
  title: Nullable<string>;
  user: Nullable<{
    id: ID;
    name: Nullable<string>;
    email: string;
    avatar: Nullable<string>;
  }>;
}

export interface CalendarFollowRow {
  id: ID;
  followerId: ID;
  followedId: ID;
  /** Hex color picked from the BE palette at follow-create. */
  color: string;
  createdAt: ISODate;
  followed?: FollowEmployeeSummary;
  follower?: FollowEmployeeSummary;
}

export interface CreateCalendarFollowInput {
  followedId: ID;
}

export const followService = {
  /** Who I'm following. */
  list: async (): Promise<CalendarFollowRow[]> => {
    const res = await apiClient.get<CalendarFollowRow[]>("/calendar-follows");
    return res.data;
  },

  /** Who follows me. */
  listFollowers: async (): Promise<CalendarFollowRow[]> => {
    const res = await apiClient.get<CalendarFollowRow[]>(
      "/calendar-follows/followers",
    );
    return res.data;
  },

  create: async (
    data: CreateCalendarFollowInput,
  ): Promise<CalendarFollowRow> => {
    const res = await apiClient.post<CalendarFollowRow>(
      "/calendar-follows",
      data,
    );
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/calendar-follows/${id}`,
    );
    return res.data;
  },
};
