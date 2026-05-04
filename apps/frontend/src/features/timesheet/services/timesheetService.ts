import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type { TimesheetResponse } from "../types";

export const timesheetService = {
  get: async (params: {
    employeeId: ID;
    year: number;
    month: number;
  }): Promise<TimesheetResponse> => {
    const res = await apiClient.get<TimesheetResponse>("/timesheet", {
      params,
    });
    return res.data;
  },
};
