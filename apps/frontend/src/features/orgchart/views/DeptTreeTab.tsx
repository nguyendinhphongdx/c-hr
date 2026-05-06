"use client";

import { ChevronDown, ChevronRight, Loader2, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { useDepartmentTree } from "@/features/departments";
import type { DepartmentNode } from "@/features/departments";
import { useEmployees, type Employee } from "@/features/employees";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPLOYEE_FETCH_LIMIT = 500;
const VISIBLE_EMPLOYEES = 5;

export function DeptTreeTab() {
  const { tree, isLoading: deptLoading, error: deptError } = useDepartmentTree();
  const employees = useEmployees({ status: "ACTIVE", limit: EMPLOYEE_FETCH_LIMIT });

  const employeesByDept = useMemo(() => {
    const map = new Map<ID, Employee[]>();
    for (const e of employees.data?.data ?? []) {
      if (!e.departmentId) continue;
      const list = map.get(e.departmentId) ?? [];
      list.push(e);
      map.set(e.departmentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) =>
        (a.user?.name ?? "").localeCompare(b.user?.name ?? ""),
      );
    }
    return map;
  }, [employees.data]);

  if (deptLoading || employees.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </CardContent>
      </Card>
    );
  }
  if (deptError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-destructive">
          Không tải được cây phòng ban.
        </CardContent>
      </Card>
    );
  }
  if (tree.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Chưa có phòng ban nào.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          {tree.map((node) => (
            <DeptNode
              key={node.id}
              node={node}
              employeesByDept={employeesByDept}
              depth={0}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DeptNode({
  node,
  employeesByDept,
  depth,
}: {
  node: DepartmentNode;
  employeesByDept: Map<ID, Employee[]>;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);
  const employees = employeesByDept.get(node.id) ?? [];
  const hasChildren = node.children.length > 0;
  const hasEmployees = employees.length > 0;
  const expandable = hasChildren || hasEmployees;
  const visible = employees.slice(0, VISIBLE_EMPLOYEES);
  const overflow = employees.length - visible.length;

  return (
    <div className={cn(depth > 0 && "ml-5 border-l border-dashed border-border pl-3")}>
      <button
        type="button"
        onClick={() => expandable && setOpen((s) => !s)}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
          expandable
            ? "hover:bg-muted/60"
            : "cursor-default opacity-90",
        )}
      >
        {expandable ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        <span className="font-medium">{node.name}</span>
        {node.code && (
          <span className="text-xs text-muted-foreground">· {node.code}</span>
        )}
        <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {hasEmployees && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {employees.length}
            </span>
          )}
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5",
              node.manager?.user?.name
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-muted",
            )}
          >
            {node.manager?.user?.name ?? "Chưa gán quản lý"}
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-1 space-y-1">
          {hasEmployees && (
            <div className="ml-5 flex flex-wrap gap-1.5 border-l border-dashed border-border py-1 pl-3">
              {visible.map((e) => (
                <EmployeeChip key={e.id} employee={e} />
              ))}
              {overflow > 0 && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  +{overflow} khác
                </span>
              )}
            </div>
          )}
          {hasChildren &&
            node.children.map((child) => (
              <DeptNode
                key={child.id}
                node={child}
                employeesByDept={employeesByDept}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function EmployeeChip({ employee }: { employee: Employee }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px]"
      title={employee.user?.email ?? ""}
    >
      <span className="font-medium">
        {employee.user?.name ?? "(không tên)"}
      </span>
      {employee.title && (
        <span className="text-muted-foreground">· {employee.title}</span>
      )}
    </span>
  );
}
