"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import type { ID } from "@/lib/types";

import { departmentsService } from "../services/departmentsService";
import type {
  CreateDepartmentInput,
  Department,
  DepartmentNode,
  UpdateDepartmentInput,
} from "../types";

export const departmentsKeys = {
  list: ["departments", "list"] as const,
  detail: (id: ID) => ["departments", "detail", id] as const,
};

export function useDepartments() {
  return useQuery({
    queryKey: departmentsKeys.list,
    queryFn: () => departmentsService.list(),
    staleTime: 60 * 1000,
  });
}

/**
 * Same data as useDepartments but already assembled into a tree (parentId
 * null → roots). Memoized so re-renders don't rebuild unnecessarily.
 */
export function useDepartmentTree() {
  const list = useDepartments();
  const tree = useMemo<DepartmentNode[]>(
    () => (list.data ? buildTree(list.data) : []),
    [list.data],
  );
  return { ...list, tree };
}

export function useDepartment(id: ID | null) {
  return useQuery({
    queryKey: id ? departmentsKeys.detail(id) : ["departments", "detail", "none"],
    queryFn: () => departmentsService.getById(id as ID),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDepartmentInput) => departmentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsKeys.list });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data: UpdateDepartmentInput }) =>
      departmentsService.update(id, data),
    onSuccess: (dept) => {
      queryClient.invalidateQueries({ queryKey: departmentsKeys.list });
      queryClient.setQueryData(departmentsKeys.detail(dept.id), dept);
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ID) => departmentsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentsKeys.list });
    },
  });
}

function buildTree(rows: Department[]): DepartmentNode[] {
  const byId = new Map<ID, DepartmentNode>();
  for (const row of rows) byId.set(row.id, { ...row, children: [] });

  const roots: DepartmentNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // Stable name-sort at each level.
  const sortRec = (nodes: DepartmentNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}
