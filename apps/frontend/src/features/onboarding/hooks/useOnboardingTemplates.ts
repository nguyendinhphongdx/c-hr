"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { templateService } from "../services/templateService";
import type {
  CreateTemplateInput,
  CreateTemplateTaskInput,
  ListTemplatesQuery,
  ReorderTemplateTasksInput,
  UpdateTemplateInput,
  UpdateTemplateTaskInput,
} from "../types";

export const onboardingTemplateKeys = {
  all: ["onboarding", "templates"] as const,
  list: (query: ListTemplatesQuery) =>
    ["onboarding", "templates", "list", query] as const,
  detail: (id: ID) => ["onboarding", "templates", "detail", id] as const,
};

export function useTemplates(query: ListTemplatesQuery = {}) {
  return useQuery({
    queryKey: onboardingTemplateKeys.list(query),
    queryFn: () => templateService.list(query),
    staleTime: 30 * 1000,
  });
}

export function useTemplate(id: ID | undefined) {
  return useQuery({
    queryKey: onboardingTemplateKeys.detail(id ?? ""),
    queryFn: () => templateService.get(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// ── Template mutations ──────────────────────────────────────────────

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateInput) => templateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingTemplateKeys.all });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateTemplateInput }) =>
      templateService.update(id, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: onboardingTemplateKeys.all });
      queryClient.invalidateQueries({
        queryKey: onboardingTemplateKeys.detail(vars.id),
      });
    },
  });
}

export function useArchiveTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => templateService.archive(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: onboardingTemplateKeys.all });
      queryClient.invalidateQueries({
        queryKey: onboardingTemplateKeys.detail(id),
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => templateService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingTemplateKeys.all });
    },
  });
}

// ── Template task mutations ─────────────────────────────────────────

export function useAddTemplateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: ID;
      data: CreateTemplateTaskInput;
    }) => templateService.addTask(templateId, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: onboardingTemplateKeys.detail(vars.templateId),
      });
      queryClient.invalidateQueries({ queryKey: onboardingTemplateKeys.all });
    },
  });
}

export function useUpdateTemplateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateTemplateTaskInput }) =>
      templateService.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingTemplateKeys.all });
    },
  });
}

export function useReorderTemplateTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      data,
    }: {
      templateId: ID;
      data: ReorderTemplateTasksInput;
    }) => templateService.reorderTasks(templateId, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: onboardingTemplateKeys.detail(vars.templateId),
      });
      queryClient.invalidateQueries({ queryKey: onboardingTemplateKeys.all });
    },
  });
}

export function useDeleteTemplateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: ID; templateId: ID }) =>
      templateService.deleteTask(id),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: onboardingTemplateKeys.detail(vars.templateId),
      });
      queryClient.invalidateQueries({ queryKey: onboardingTemplateKeys.all });
    },
  });
}
