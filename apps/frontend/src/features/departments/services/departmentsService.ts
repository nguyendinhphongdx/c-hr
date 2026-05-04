import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateDepartmentInput,
  Department,
  UpdateDepartmentInput,
} from "../types";

export const departmentsService = {
  list: async (): Promise<Department[]> => {
    const res = await apiClient.get<Department[]>("/departments");
    return res.data;
  },

  getById: async (id: ID): Promise<Department> => {
    const res = await apiClient.get<Department>(`/departments/${id}`);
    return res.data;
  },

  create: async (data: CreateDepartmentInput): Promise<Department> => {
    const res = await apiClient.post<Department>("/departments", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateDepartmentInput): Promise<Department> => {
    const res = await apiClient.patch<Department>(`/departments/${id}`, data);
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/departments/${id}`,
    );
    return res.data;
  },
};
