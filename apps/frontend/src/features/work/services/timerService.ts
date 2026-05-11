import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  ListTimersQuery,
  StartTimerInput,
  StopTimerInput,
  SummaryTimersQuery,
  TaskTimer,
  TimerSummaryRow,
} from "../types";

export const timerService = {
  start: async (data: StartTimerInput): Promise<TaskTimer> => {
    const res = await apiClient.post<TaskTimer>("/task-timers/start", data);
    return res.data;
  },

  stop: async (id: ID, data: StopTimerInput = {}): Promise<TaskTimer> => {
    const res = await apiClient.post<TaskTimer>(
      `/task-timers/${id}/stop`,
      data,
    );
    return res.data;
  },

  current: async (): Promise<TaskTimer | null> => {
    const res = await apiClient.get<TaskTimer | null>("/task-timers/current");
    return res.data;
  },

  list: async (query: ListTimersQuery = {}): Promise<TaskTimer[]> => {
    const params: Record<string, unknown> = {};
    if (query.taskId) params.taskId = query.taskId;
    if (query.userId) params.userId = query.userId;
    if (query.from) params.from = query.from;
    if (query.to) params.to = query.to;
    const res = await apiClient.get<TaskTimer[]>("/task-timers", { params });
    return res.data;
  },

  summary: async (query: SummaryTimersQuery): Promise<TimerSummaryRow[]> => {
    const res = await apiClient.get<TimerSummaryRow[]>(
      "/task-timers/summary",
      { params: query },
    );
    return res.data;
  },
};
