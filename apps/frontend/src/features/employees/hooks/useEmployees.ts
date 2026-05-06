"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { employeesService } from "../services/employeesService";
import type {
  CreateEmployeeInput,
  EmployeeImportBulkInput,
  EmployeesListQuery,
  UpdateEmployeeInput,
} from "../types";

export const employeesKeys = {
  list: (query: EmployeesListQuery) => ["employees", "list", query] as const,
  detail: (id: ID) => ["employees", "detail", id] as const,
};

export function useEmployees(query: EmployeesListQuery = {}) {
  return useQuery({
    queryKey: employeesKeys.list(query),
    queryFn: () => employeesService.list(query),
    staleTime: 30 * 1000,
  });
}

export function useEmployee(id: ID | null) {
  return useQuery({
    queryKey: id ? employeesKeys.detail(id) : ["employees", "detail", "none"],
    queryFn: () => employeesService.getById(id as ID),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeInput) => employeesService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", "list"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateEmployeeInput }) =>
      employeesService.update(id, data),
    onSuccess: (employee) => {
      queryClient.invalidateQueries({ queryKey: ["employees", "list"] });
      queryClient.setQueryData(employeesKeys.detail(employee.id), employee);
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => employeesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", "list"] });
    },
  });
}

export function useParseEmployeeImport() {
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => employeesService.parseImport(file, onProgress),
  });
}

export function useImportEmployees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeImportBulkInput) =>
      employeesService.bulkCreateImport(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", "list"] });
    },
  });
}
