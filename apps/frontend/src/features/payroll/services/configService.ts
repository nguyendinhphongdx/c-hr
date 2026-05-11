import { apiClient } from "@/lib/api/client";

import type { PayrollConfig, UpdateConfigInput } from "../types";

export const payrollConfigService = {
  get: async (year: number): Promise<PayrollConfig> => {
    const res = await apiClient.get<PayrollConfig>("/payroll/config", {
      params: { year },
    });
    return res.data;
  },

  list: async (): Promise<PayrollConfig[]> => {
    const res = await apiClient.get<PayrollConfig[]>("/payroll/config/list");
    return res.data;
  },

  update: async (
    year: number,
    data: UpdateConfigInput,
  ): Promise<PayrollConfig> => {
    const res = await apiClient.patch<PayrollConfig>("/payroll/config", data, {
      params: { year },
    });
    return res.data;
  },
};
