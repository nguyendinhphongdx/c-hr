"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ID } from "@/lib/types";

import { projectService } from "../services/projectService";
import type {
  AddMemberInput,
  CreateProjectInput,
  CreateSectionInput,
  ListProjectsQuery,
  ReorderSectionsInput,
  TransferOwnershipInput,
  UpdateMemberRoleInput,
  UpdateProjectInput,
  UpdateSectionInput,
} from "../types";

export const projectKeys = {
  all: ["projects"] as const,
  list: (q: ListProjectsQuery) => ["projects", "list", q] as const,
  detail: (idOrSlug: string) => ["projects", "detail", idOrSlug] as const,
  members: (projectId: ID) => ["projects", projectId, "members"] as const,
  sections: (projectId: ID) => ["projects", projectId, "sections"] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: projectKeys.all });
}

// ── Queries ───────────────────────────────────────────────────────────

export function useProjects(query: ListProjectsQuery = {}) {
  return useQuery({
    queryKey: projectKeys.list(query),
    queryFn: () => projectService.list(query),
    staleTime: 30 * 1000,
  });
}

export function useProject(idOrSlug: string | null) {
  return useQuery({
    queryKey: idOrSlug
      ? projectKeys.detail(idOrSlug)
      : ["projects", "detail", "none"],
    queryFn: () => projectService.getByIdOrSlug(idOrSlug as string),
    enabled: !!idOrSlug,
  });
}

export function useProjectMembers(projectId: ID | null) {
  return useQuery({
    queryKey: projectId
      ? projectKeys.members(projectId)
      : ["projects", "none", "members"],
    queryFn: () => projectService.listMembers(projectId as ID),
    enabled: !!projectId,
  });
}

export function useProjectSections(projectId: ID | null) {
  return useQuery({
    queryKey: projectId
      ? projectKeys.sections(projectId)
      : ["projects", "none", "sections"],
    queryFn: () => projectService.listSections(projectId as ID),
    enabled: !!projectId,
  });
}

// ── Project mutations ─────────────────────────────────────────────────

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectService.create(data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateProjectInput }) =>
      projectService.update(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => projectService.archive(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUnarchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => projectService.unarchive(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => projectService.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useTransferOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: TransferOwnershipInput }) =>
      projectService.transferOwnership(id, data),
    onSuccess: () => invalidateAll(qc),
  });
}

// ── Member mutations ──────────────────────────────────────────────────

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: ID;
      data: AddMemberInput;
    }) => projectService.addMember(projectId, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      userId,
      data,
    }: {
      projectId: ID;
      userId: ID;
      data: UpdateMemberRoleInput;
    }) => projectService.updateMemberRole(projectId, userId, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: ID; userId: ID }) =>
      projectService.removeMember(projectId, userId),
    onSuccess: () => invalidateAll(qc),
  });
}

// ── Section mutations ─────────────────────────────────────────────────

export function useCreateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: ID;
      data: CreateSectionInput;
    }) => projectService.createSection(projectId, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectionId,
      data,
    }: {
      sectionId: ID;
      data: UpdateSectionInput;
    }) => projectService.updateSection(sectionId, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useReorderSections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: ID;
      data: ReorderSectionsInput;
    }) => projectService.reorderSections(projectId, data),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useDeleteSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: ID) => projectService.removeSection(sectionId),
    onSuccess: () => invalidateAll(qc),
  });
}
