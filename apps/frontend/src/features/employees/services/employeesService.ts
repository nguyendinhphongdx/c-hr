import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateEmployeeInput,
  Employee,
  EmployeesListQuery,
  EmployeesListResponse,
  UpdateEmployeeInput,
} from "../types";

export const employeesService = {
  list: async (query: EmployeesListQuery = {}): Promise<EmployeesListResponse> => {
    const res = await apiClient.get<EmployeesListResponse>("/employees", {
      params: query,
    });
    return res.data;
  },

  getById: async (id: ID): Promise<Employee> => {
    const res = await apiClient.get<Employee>(`/employees/${id}`);
    return res.data;
  },

  create: async (data: CreateEmployeeInput): Promise<Employee> => {
    const res = await apiClient.post<Employee>("/employees", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateEmployeeInput): Promise<Employee> => {
    const res = await apiClient.patch<Employee>(`/employees/${id}`, data);
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/employees/${id}`,
    );
    return res.data;
  },
};
