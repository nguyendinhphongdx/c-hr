import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  AttendanceCorrection,
  CreateAttendanceCorrectionInput,
  DecideCorrectionInput,
  ListCorrectionsQuery,
} from "../types";

export const attendanceCorrectionService = {
  list: async (
    query: ListCorrectionsQuery = {},
  ): Promise<AttendanceCorrection[]> => {
    const res = await apiClient.get<AttendanceCorrection[]>(
      "/attendance-corrections",
      { params: query },
    );
    return res.data;
  },

  getById: async (id: ID): Promise<AttendanceCorrection> => {
    const res = await apiClient.get<AttendanceCorrection>(
      `/attendance-corrections/${id}`,
    );
    return res.data;
  },

  create: async (
    data: CreateAttendanceCorrectionInput,
  ): Promise<AttendanceCorrection> => {
    const res = await apiClient.post<AttendanceCorrection>(
      "/attendance-corrections",
      data,
    );
    return res.data;
  },

  approve: async (
    id: ID,
    data: DecideCorrectionInput = {},
  ): Promise<AttendanceCorrection> => {
    const res = await apiClient.post<AttendanceCorrection>(
      `/attendance-corrections/${id}/approve`,
      data,
    );
    return res.data;
  },

  reject: async (
    id: ID,
    data: DecideCorrectionInput,
  ): Promise<AttendanceCorrection> => {
    const res = await apiClient.post<AttendanceCorrection>(
      `/attendance-corrections/${id}/reject`,
      data,
    );
    return res.data;
  },

  cancel: async (id: ID): Promise<AttendanceCorrection> => {
    const res = await apiClient.post<AttendanceCorrection>(
      `/attendance-corrections/${id}/cancel`,
      {},
    );
    return res.data;
  },
};
