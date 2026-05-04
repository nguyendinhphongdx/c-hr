import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateWorkScheduleInput,
  UpdateWorkScheduleInput,
  WorkSchedule,
} from "../types";

export const workScheduleService = {
  list: async (): Promise<WorkSchedule[]> => {
    const res = await apiClient.get<WorkSchedule[]>("/work-schedules");
    return res.data;
  },

  getById: async (id: ID): Promise<WorkSchedule> => {
    const res = await apiClient.get<WorkSchedule>(`/work-schedules/${id}`);
    return res.data;
  },

  create: async (data: CreateWorkScheduleInput): Promise<WorkSchedule> => {
    const res = await apiClient.post<WorkSchedule>("/work-schedules", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateWorkScheduleInput): Promise<WorkSchedule> => {
    const res = await apiClient.patch<WorkSchedule>(`/work-schedules/${id}`, data);
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/work-schedules/${id}`,
    );
    return res.data;
  },
};
