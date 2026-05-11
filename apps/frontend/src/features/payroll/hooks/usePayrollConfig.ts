"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { payrollConfigService } from "../services/configService";
import type { UpdateConfigInput } from "../types";

export const payrollConfigKeys = {
  detail: (year: number) => ["payroll", "config", year] as const,
  list: () => ["payroll", "config", "list"] as const,
};

export function usePayrollConfig(year: number) {
  return useQuery({
    queryKey: payrollConfigKeys.detail(year),
    queryFn: () => payrollConfigService.get(year),
    staleTime: 60 * 1000,
  });
}

export function usePayrollConfigList() {
  return useQuery({
    queryKey: payrollConfigKeys.list(),
    queryFn: () => payrollConfigService.list(),
    staleTime: 60 * 1000,
  });
}

export function useUpdatePayrollConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, data }: { year: number; data: UpdateConfigInput }) =>
      payrollConfigService.update(year, data),
    onSuccess: (config) => {
      queryClient.setQueryData(payrollConfigKeys.detail(config.year), config);
      queryClient.invalidateQueries({ queryKey: payrollConfigKeys.list() });
    },
  });
}
