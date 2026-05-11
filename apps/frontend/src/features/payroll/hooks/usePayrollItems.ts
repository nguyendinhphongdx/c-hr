"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { payrollItemService } from "../services/itemService";
import type { ListItemsQuery, UpdateItemInput } from "../types";

import { payrollPeriodKeys } from "./usePayrollPeriods";

export const payrollItemKeys = {
  all: ["payroll", "items"] as const,
  list: (periodId: ID, query: ListItemsQuery) =>
    ["payroll", "items", "list", periodId, query] as const,
  detail: (id: ID) => ["payroll", "items", "detail", id] as const,
};

export function usePayrollItems(
  periodId: ID | null | undefined,
  query: ListItemsQuery = {},
) {
  return useQuery({
    queryKey: payrollItemKeys.list(periodId ?? "", query),
    queryFn: () =>
      payrollItemService.listForPeriod(periodId as ID, query),
    enabled: !!periodId,
    staleTime: 15 * 1000,
  });
}

export function usePayrollItem(id: ID | null | undefined) {
  return useQuery({
    queryKey: payrollItemKeys.detail(id ?? ""),
    queryFn: () => payrollItemService.get(id as ID),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

function invalidateForPeriod(
  queryClient: ReturnType<typeof useQueryClient>,
  periodId: ID,
) {
  queryClient.invalidateQueries({ queryKey: payrollItemKeys.all });
  queryClient.invalidateQueries({ queryKey: payrollPeriodKeys.all });
  queryClient.invalidateQueries({
    queryKey: payrollPeriodKeys.detail(periodId),
  });
}

export function useUpdatePayrollItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateItemInput }) =>
      payrollItemService.update(id, data),
    onSuccess: (item) => {
      queryClient.setQueryData(payrollItemKeys.detail(item.id), item);
      invalidateForPeriod(queryClient, item.periodId);
    },
  });
}

export function useRecomputePayrollItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => payrollItemService.recompute(id),
    onSuccess: (item) => {
      queryClient.setQueryData(payrollItemKeys.detail(item.id), item);
      invalidateForPeriod(queryClient, item.periodId);
    },
  });
}
