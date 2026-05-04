import { apiClient } from "@/lib/api/client";
import type { AppCode } from "@/features/auth";
import type { ID, ISODate, Nullable } from "@/lib/types";

export interface AppAdminUserSummary {
  id: ID;
  email: string;
  name: Nullable<string>;
  avatar: Nullable<string>;
}

/** Row shape returned by GET /app-admins. The grant joined with the user
 *  it was granted to. */
export interface AppAdminRow {
  id: ID;
  userId: ID;
  organizationId: ID;
  appCode: AppCode;
  grantedBy: Nullable<ID>;
  createdAt: ISODate;
  user: AppAdminUserSummary;
}

export interface GrantAppAdminInput {
  userId: ID;
  appCode: AppCode;
}

export const appAdminsService = {
  list: async (app?: AppCode): Promise<AppAdminRow[]> => {
    const res = await apiClient.get<AppAdminRow[]>("/app-admins", {
      params: app ? { app } : undefined,
    });
    return res.data;
  },

  grant: async (data: GrantAppAdminInput): Promise<AppAdminRow> => {
    const res = await apiClient.post<AppAdminRow>("/app-admins", data);
    return res.data;
  },

  revoke: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/app-admins/${id}`,
    );
    return res.data;
  },
};
