import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  ListItemsQuery,
  PayrollItemDetail,
  PayrollItemRow,
  UpdateItemInput,
} from "../types";

export const payrollItemService = {
  listForPeriod: async (
    periodId: ID,
    query: ListItemsQuery = {},
  ): Promise<PayrollItemRow[]> => {
    const res = await apiClient.get<PayrollItemRow[]>(
      `/payroll/periods/${periodId}/items`,
      { params: query },
    );
    return res.data;
  },

  get: async (id: ID): Promise<PayrollItemDetail> => {
    const res = await apiClient.get<PayrollItemDetail>(
      `/payroll/items/${id}`,
    );
    return res.data;
  },

  update: async (
    id: ID,
    input: UpdateItemInput,
  ): Promise<PayrollItemDetail> => {
    const res = await apiClient.patch<PayrollItemDetail>(
      `/payroll/items/${id}`,
      input,
    );
    return res.data;
  },

  recompute: async (id: ID): Promise<PayrollItemDetail> => {
    const res = await apiClient.post<PayrollItemDetail>(
      `/payroll/items/${id}/recompute`,
    );
    return res.data;
  },

  /** Download the per-item payslip as an XLSX. Caller triggers the browser save. */
  payslipXlsx: async (id: ID): Promise<Blob> => {
    const res = await apiClient.get<Blob>(
      `/payroll/items/${id}/payslip.xlsx`,
      { responseType: "blob" },
    );
    return res.data;
  },

  /** Download the per-item payslip as a PDF. Same blob → browser save flow. */
  payslipPdf: async (id: ID): Promise<Blob> => {
    const res = await apiClient.get<Blob>(
      `/payroll/items/${id}/payslip.pdf`,
      { responseType: "blob" },
    );
    return res.data;
  },
};
