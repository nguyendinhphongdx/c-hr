"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { taskService } from "../services/taskService";
import type {
  CreateTaskInput,
  ListTasksQuery,
  ReorderTasksInput,
  UpdateTaskInput,
} from "../types";

export const taskKeys = {
  all: ["tasks"] as const,
  list: (q: ListTasksQuery) => ["tasks", "list", q] as const,
  detail: (idOrCode: string) => ["tasks", "detail", idOrCode] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: taskKeys.all });
}

export function useTasks(query: ListTasksQuery = {}, enabled = true) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => taskService.list(query),
    enabled,
    staleTime: 15 * 1000,
  });
}

export function useTask(idOrCode: string | null) {
  return useQuery({
    queryKey: idOrCode
      ? taskKeys.detail(idOrCode)
      : ["tasks", "detail", "none"],
    queryFn: () => taskService.getByIdOrCode(idOrCode as string),
    enabled: !!idOrCode,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskInput) => taskService.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateTaskInput }) =>
      taskService.update(id, data),
    onSuccess: (updated, vars) => {
      qc.invalidateQueries({ queryKey: taskKeys.all });
      if (updated?.code) {
        qc.invalidateQueries({ queryKey: taskKeys.detail(updated.code) });
      }
      qc.invalidateQueries({ queryKey: taskKeys.detail(vars.id) });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => taskService.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useReorderTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      sectionId,
      data,
    }: {
      projectId: ID;
      sectionId: ID;
      data: ReorderTasksInput;
    }) => taskService.reorder(projectId, sectionId, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useWatchTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => taskService.watch(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUnwatchTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => taskService.unwatch(id),
    onSuccess: () => invalidateAll(qc),
  });
}
