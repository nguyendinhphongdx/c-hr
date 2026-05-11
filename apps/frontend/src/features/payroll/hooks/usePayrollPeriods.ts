"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { payrollPeriodService } from "../services/periodService";
import type {
  CreatePeriodInput,
  ListPeriodsQuery,
} from "../types";

export const payrollPeriodKeys = {
  all: ["payroll", "periods"] as const,
  list: (query: ListPeriodsQuery) =>
    ["payroll", "periods", "list", query] as const,
  detail: (id: ID) => ["payroll", "periods", "detail", id] as const,
};

export function usePayrollPeriods(query: ListPeriodsQuery = {}) {
  return useQuery({
    queryKey: payrollPeriodKeys.list(query),
    queryFn: () => payrollPeriodService.list(query),
    staleTime: 30 * 1000,
  });
}

export function usePayrollPeriod(id: ID | null | undefined) {
  return useQuery({
    queryKey: payrollPeriodKeys.detail(id ?? ""),
    queryFn: () => payrollPeriodService.get(id as ID),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

function invalidateAllPeriods(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: payrollPeriodKeys.all });
}

export function useCreatePayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePeriodInput) =>
      payrollPeriodService.create(input),
    onSuccess: () => {
      invalidateAllPeriods(queryClient);
    },
  });
}

export function useUpdatePayrollPeriodNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: ID; note: string }) =>
      payrollPeriodService.updateNote(id, note),
    onSuccess: (period) => {
      queryClient.setQueryData(
        payrollPeriodKeys.detail(period.id),
        period,
      );
      queryClient.invalidateQueries({ queryKey: payrollPeriodKeys.all });
    },
  });
}

export function useClosePayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => payrollPeriodService.close(id),
    onSuccess: (period) => {
      queryClient.setQueryData(
        payrollPeriodKeys.detail(period.id),
        period,
      );
      queryClient.invalidateQueries({ queryKey: payrollPeriodKeys.all });
    },
  });
}

export function usePayPayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => payrollPeriodService.pay(id),
    onSuccess: (period) => {
      queryClient.setQueryData(
        payrollPeriodKeys.detail(period.id),
        period,
      );
      queryClient.invalidateQueries({ queryKey: payrollPeriodKeys.all });
    },
  });
}

export function useReopenPayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => payrollPeriodService.reopen(id),
    onSuccess: (period) => {
      queryClient.setQueryData(
        payrollPeriodKeys.detail(period.id),
        period,
      );
      queryClient.invalidateQueries({ queryKey: payrollPeriodKeys.all });
    },
  });
}

export function useRecomputePayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => payrollPeriodService.recompute(id),
    onSuccess: (period) => {
      queryClient.setQueryData(
        payrollPeriodKeys.detail(period.id),
        period,
      );
      queryClient.invalidateQueries({ queryKey: payrollPeriodKeys.all });
    },
  });
}

export function useDeletePayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => payrollPeriodService.remove(id),
    onSuccess: () => {
      invalidateAllPeriods(queryClient);
    },
  });
}
