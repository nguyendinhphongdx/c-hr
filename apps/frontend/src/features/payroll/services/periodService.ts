import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  CreatePeriodInput,
  ListPeriodsQuery,
  PayrollPeriodDetail,
  PayrollPeriodRow,
  UpdatePeriodInput,
} from "../types";

export const payrollPeriodService = {
  list: async (query: ListPeriodsQuery = {}): Promise<PayrollPeriodRow[]> => {
    const res = await apiClient.get<PayrollPeriodRow[]>("/payroll/periods", {
      params: query,
    });
    return res.data;
  },

  get: async (id: ID): Promise<PayrollPeriodDetail> => {
    const res = await apiClient.get<PayrollPeriodDetail>(
      `/payroll/periods/${id}`,
    );
    return res.data;
  },

  create: async (input: CreatePeriodInput): Promise<PayrollPeriodDetail> => {
    const res = await apiClient.post<PayrollPeriodDetail>(
      "/payroll/periods",
      input,
    );
    return res.data;
  },

  updateNote: async (
    id: ID,
    note: string,
  ): Promise<PayrollPeriodDetail> => {
    const res = await apiClient.patch<PayrollPeriodDetail>(
      `/payroll/periods/${id}`,
      { note } satisfies UpdatePeriodInput,
    );
    return res.data;
  },

  close: async (id: ID): Promise<PayrollPeriodDetail> => {
    const res = await apiClient.post<PayrollPeriodDetail>(
      `/payroll/periods/${id}/close`,
    );
    return res.data;
  },

  pay: async (id: ID): Promise<PayrollPeriodDetail> => {
    const res = await apiClient.post<PayrollPeriodDetail>(
      `/payroll/periods/${id}/pay`,
    );
    return res.data;
  },

  reopen: async (id: ID): Promise<PayrollPeriodDetail> => {
    const res = await apiClient.post<PayrollPeriodDetail>(
      `/payroll/periods/${id}/reopen`,
    );
    return res.data;
  },

  recompute: async (id: ID): Promise<PayrollPeriodDetail> => {
    const res = await apiClient.post<PayrollPeriodDetail>(
      `/payroll/periods/${id}/recompute`,
    );
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/payroll/periods/${id}`,
    );
    return res.data;
  },

  /** Download the bulk-period payslips workbook (1 sheet/item + summary). */
  payslipsBulkXlsx: async (id: ID): Promise<Blob> => {
    const res = await apiClient.get<Blob>(
      `/payroll/periods/${id}/payslips.xlsx`,
      { responseType: "blob" },
    );
    return res.data;
  },
};
