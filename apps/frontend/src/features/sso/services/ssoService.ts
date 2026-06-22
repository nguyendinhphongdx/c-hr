import { apiClient } from "@/lib/api/client";

import type { SsoConfig, StartSsoResponse, UpsertSsoConfigInput } from "../types";

export const ssoService = {
  getMyConfig: async (): Promise<SsoConfig | null> => {
    const res = await apiClient.get<SsoConfig | null>("/sso/configs/me");
    return res.data;
  },

  upsertMyConfig: async (input: UpsertSsoConfigInput): Promise<SsoConfig> => {
    const res = await apiClient.put<SsoConfig>("/sso/configs/me", input);
    return res.data;
  },

  deleteMyConfig: async (): Promise<void> => {
    await apiClient.delete("/sso/configs/me");
  },

  startEntra: async (orgSlug: string, returnTo?: string): Promise<StartSsoResponse> => {
    const res = await apiClient.get<StartSsoResponse>("/sso/entra/start", {
      params: { orgSlug, ...(returnTo ? { returnTo } : {}) },
    });
    return res.data;
  },
};
