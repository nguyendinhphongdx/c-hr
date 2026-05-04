import { apiClient } from "@/lib/api/client";

import type { ListOrgUsersQuery, OrgUser } from "../types";

export const usersService = {
  list: async (query: ListOrgUsersQuery = {}): Promise<OrgUser[]> => {
    const res = await apiClient.get<OrgUser[]>("/users", {
      params: query,
    });
    return res.data;
  },
};
