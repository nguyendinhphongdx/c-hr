import type { AxiosProgressEvent } from "axios";

import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreateEmployeeInput,
  Employee,
  EmployeeImportBulkInput,
  EmployeeImportBulkResponse,
  EmployeeImportParseResponse,
  EmployeesListQuery,
  EmployeesListResponse,
  Role,
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

  updateRole: async (id: ID, role: Role): Promise<{ id: ID; role: Role }> => {
    const res = await apiClient.patch<{ id: ID; role: Role }>(
      `/employees/${id}/role`,
      { role },
    );
    return res.data;
  },

  templateUrl: (type: "csv" | "xlsx" = "xlsx"): string => {
    const base = (apiClient.defaults.baseURL ?? "").replace(/\/api\/v\d+$/, "");
    return `${base}/static/templates/employee-import.${type}`;
  },

  parseImport: async (
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<EmployeeImportParseResponse> => {
    const form = new FormData();
    form.append("file", file);
    const res = await apiClient.post<EmployeeImportParseResponse>(
      "/employees/import/parse",
      form,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e: AxiosProgressEvent) => {
          if (!onProgress || !e.total) return;
          onProgress(Math.round((e.loaded / e.total) * 100));
        },
      },
    );
    return res.data;
  },

  bulkCreateImport: async (
    input: EmployeeImportBulkInput,
  ): Promise<EmployeeImportBulkResponse> => {
    const res = await apiClient.post<EmployeeImportBulkResponse>(
      "/employees/import/bulk-create",
      input,
    );
    return res.data;
  },
};
