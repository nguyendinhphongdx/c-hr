import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateLeaveRequestInput,
  DecideLeaveRequestInput,
  LeaveRequest,
  ListLeaveRequestsQuery,
} from "../types";

export const leaveRequestService = {
  list: async (query: ListLeaveRequestsQuery = {}): Promise<LeaveRequest[]> => {
    const res = await apiClient.get<LeaveRequest[]>("/leave-requests", {
      params: query,
    });
    return res.data;
  },

  getById: async (id: ID): Promise<LeaveRequest> => {
    const res = await apiClient.get<LeaveRequest>(`/leave-requests/${id}`);
    return res.data;
  },

  create: async (data: CreateLeaveRequestInput): Promise<LeaveRequest> => {
    const res = await apiClient.post<LeaveRequest>("/leave-requests", data);
    return res.data;
  },

  approve: async (
    id: ID,
    data: DecideLeaveRequestInput = {},
  ): Promise<LeaveRequest> => {
    const res = await apiClient.post<LeaveRequest>(
      `/leave-requests/${id}/approve`,
      data,
    );
    return res.data;
  },

  reject: async (
    id: ID,
    data: DecideLeaveRequestInput,
  ): Promise<LeaveRequest> => {
    const res = await apiClient.post<LeaveRequest>(
      `/leave-requests/${id}/reject`,
      data,
    );
    return res.data;
  },

  cancel: async (id: ID): Promise<LeaveRequest> => {
    const res = await apiClient.post<LeaveRequest>(
      `/leave-requests/${id}/cancel`,
      {},
    );
    return res.data;
  },
};
