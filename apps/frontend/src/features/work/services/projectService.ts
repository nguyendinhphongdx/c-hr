import { apiClient } from "@/lib/api/client";
import type { ID } from "@/lib/types";

import type {
  AddMemberInput,
  CreateProjectInput,
  CreateSectionInput,
  ListProjectsQuery,
  Project,
  ProjectMember,
  ReorderSectionsInput,
  TaskSection,
  TransferOwnershipInput,
  UpdateMemberRoleInput,
  UpdateProjectInput,
  UpdateSectionInput,
} from "../types";

export const projectService = {
  // ── Projects ────────────────────────────────────────────────────────
  list: async (query: ListProjectsQuery = {}): Promise<Project[]> => {
    const params: Record<string, unknown> = {};
    if (query.status) params.status = query.status;
    if (query.q) params.q = query.q;
    if (query.includeArchived) params.includeArchived = "true";
    const res = await apiClient.get<Project[]>("/projects", { params });
    return res.data;
  },

  getByIdOrSlug: async (idOrSlug: string): Promise<Project> => {
    const res = await apiClient.get<Project>(
      `/projects/${encodeURIComponent(idOrSlug)}`,
    );
    return res.data;
  },

  create: async (data: CreateProjectInput): Promise<Project> => {
    const res = await apiClient.post<Project>("/projects", data);
    return res.data;
  },

  update: async (id: ID, data: UpdateProjectInput): Promise<Project> => {
    const res = await apiClient.patch<Project>(`/projects/${id}`, data);
    return res.data;
  },

  remove: async (id: ID): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/projects/${id}`,
    );
    return res.data;
  },

  archive: async (id: ID): Promise<Project> => {
    const res = await apiClient.post<Project>(`/projects/${id}/archive`, {});
    return res.data;
  },

  unarchive: async (id: ID): Promise<Project> => {
    const res = await apiClient.post<Project>(`/projects/${id}/unarchive`, {});
    return res.data;
  },

  transferOwnership: async (
    id: ID,
    data: TransferOwnershipInput,
  ): Promise<Project> => {
    const res = await apiClient.post<Project>(
      `/projects/${id}/transfer-ownership`,
      data,
    );
    return res.data;
  },

  // ── Members ─────────────────────────────────────────────────────────
  listMembers: async (projectId: ID): Promise<ProjectMember[]> => {
    const res = await apiClient.get<ProjectMember[]>(
      `/projects/${projectId}/members`,
    );
    return res.data;
  },

  addMember: async (
    projectId: ID,
    data: AddMemberInput,
  ): Promise<ProjectMember> => {
    const res = await apiClient.post<ProjectMember>(
      `/projects/${projectId}/members`,
      data,
    );
    return res.data;
  },

  updateMemberRole: async (
    projectId: ID,
    userId: ID,
    data: UpdateMemberRoleInput,
  ): Promise<ProjectMember> => {
    const res = await apiClient.patch<ProjectMember>(
      `/projects/${projectId}/members/${userId}`,
      data,
    );
    return res.data;
  },

  removeMember: async (
    projectId: ID,
    userId: ID,
  ): Promise<{ success: true }> => {
    const res = await apiClient.delete<{ success: true }>(
      `/projects/${projectId}/members/${userId}`,
    );
    return res.data;
  },

  // ── Sections ────────────────────────────────────────────────────────
  listSections: async (projectId: ID): Promise<TaskSection[]> => {
    const res = await apiClient.get<TaskSection[]>(
      `/projects/${projectId}/sections`,
    );
    return res.data;
  },

  createSection: async (
    projectId: ID,
    data: CreateSectionInput,
  ): Promise<TaskSection> => {
    const res = await apiClient.post<TaskSection>(
      `/projects/${projectId}/sections`,
      data,
    );
    return res.data;
  },

  updateSection: async (
    sectionId: ID,
    data: UpdateSectionInput,
  ): Promise<TaskSection> => {
    const res = await apiClient.patch<TaskSection>(
      `/sections/${sectionId}`,
      data,
    );
    return res.data;
  },

  reorderSections: async (
    projectId: ID,
    data: ReorderSectionsInput,
  ): Promise<TaskSection[]> => {
    const res = await apiClient.put<TaskSection[]>(
      `/projects/${projectId}/sections/order`,
      data,
    );
    return res.data;
  },

  removeSection: async (
    sectionId: ID,
  ): Promise<{ id: ID; success: true }> => {
    const res = await apiClient.delete<{ id: ID; success: true }>(
      `/sections/${sectionId}`,
    );
    return res.data;
  },
};
