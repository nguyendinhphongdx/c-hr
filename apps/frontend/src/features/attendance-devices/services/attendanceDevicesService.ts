import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  AttendanceDevice,
  CreateDeviceInput,
  CreateDeviceResponse,
  UpdateDeviceInput,
} from "../types";

export const attendanceDevicesService = {
  list: async (): Promise<AttendanceDevice[]> => {
    const res = await apiClient.get<AttendanceDevice[]>("/attendance-devices");
    return res.data;
  },

  getById: async (id: ID): Promise<AttendanceDevice> => {
    const res = await apiClient.get<AttendanceDevice>(`/attendance-devices/${id}`);
    return res.data;
  },

  create: async (data: CreateDeviceInput): Promise<CreateDeviceResponse> => {
    const res = await apiClient.post<CreateDeviceResponse>(
      "/attendance-devices",
      data,
    );
    return res.data;
  },

  update: async (id: ID, data: UpdateDeviceInput): Promise<AttendanceDevice> => {
    const res = await apiClient.patch<AttendanceDevice>(
      `/attendance-devices/${id}`,
      data,
    );
    return res.data;
  },

  regenerateToken: async (id: ID): Promise<CreateDeviceResponse> => {
    const res = await apiClient.post<CreateDeviceResponse>(
      `/attendance-devices/${id}/regenerate-token`,
    );
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/attendance-devices/${id}`,
    );
    return res.data;
  },
};
