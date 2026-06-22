import { apiClient } from "@/lib/api/client";

import type { StartSsoResponse } from "../types";

export const ssoService = {
  startEntra: async (returnTo?: string): Promise<StartSsoResponse> => {
    const res = await apiClient.get<StartSsoResponse>("/sso/entra/start", {
      params: returnTo ? { returnTo } : undefined,
    });
    return res.data;
  },
};
