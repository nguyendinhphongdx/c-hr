"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import dagre from "dagre";
import { Loader2, Users } from "lucide-react";
import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { useDepartments } from "@/features/departments";
import type { Department } from "@/features/departments";
import { useEmployees, type Employee } from "@/features/employees";
import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 160;
const VISIBLE_EMPLOYEES = 4;
const EMPLOYEE_FETCH_LIMIT = 500;

interface DeptNodeData extends Record<string, unknown> {
  name: string;
  code: string | null;
  managerName: string | null;
  employees: Employee[];
}

type DeptFlowNode = Node<DeptNodeData, "dept">;

const nodeTypes = { dept: DeptCard };

export function OrgFlowTab() {
  const departments = useDepartments();
  const employees = useEmployees({ status: "ACTIVE", limit: EMPLOYEE_FETCH_LIMIT });

  const { nodes, edges } = useMemo(
    () => buildGraph(departments.data ?? [], employees.data?.data ?? []),
    [departments.data, employees.data],
  );

  if (departments.isLoading || employees.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
        </CardContent>
      </Card>
    );
  }
  if (departments.error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-destructive">
          Không tải được sơ đồ tổ chức.
        </CardContent>
      </Card>
    );
  }
  if (nodes.length === 0) {
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
      <CardContent className="p-0">
        <div className="h-160 w-full overflow-hidden rounded-md">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            edgesFocusable={false}
            proOptions={{ hideAttribution: true }}
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor="#a3b3c2"
              nodeStrokeColor="#64748b"
              nodeStrokeWidth={2}
              maskColor="rgba(15, 23, 42, 0.05)"
            />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}

function DeptCard({ data }: NodeProps<DeptFlowNode>) {
  const visible = data.employees.slice(0, VISIBLE_EMPLOYEES);
  const overflow = data.employees.length - visible.length;

  return (
    <div
      className="rounded-lg border border-border bg-card p-3 shadow-sm"
      style={{ width: NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0!" />

      <div className="flex items-baseline justify-between gap-2">
        <div className="truncate text-sm font-semibold">{data.name}</div>
        {data.code && (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {data.code}
          </span>
        )}
      </div>

      <div
        className={cn(
          "mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[10px]",
          data.managerName
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : "bg-muted text-muted-foreground",
        )}
      >
        {data.managerName ?? "Chưa gán quản lý"}
      </div>

      {data.employees.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-border pt-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Users className="h-3 w-3" />
            {data.employees.length} nhân viên
          </div>
          <div className="flex flex-wrap gap-1">
            {visible.map((e) => (
              <span
                key={e.id}
                className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px]"
                title={e.user?.email ?? ""}
              >
                {e.user?.name ?? "(không tên)"}
              </span>
            ))}
            {overflow > 0 && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                +{overflow}
              </span>
            )}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0!" />
    </div>
  );
}

function buildGraph(
  departments: Department[],
  allEmployees: Employee[],
): { nodes: DeptFlowNode[]; edges: Edge[] } {
  if (departments.length === 0) return { nodes: [], edges: [] };

  const employeesByDept = new Map<ID, Employee[]>();
  for (const e of allEmployees) {
    if (!e.departmentId) continue;
    const list = employeesByDept.get(e.departmentId) ?? [];
    list.push(e);
    employeesByDept.set(e.departmentId, list);
  }
  for (const list of employeesByDept.values()) {
    list.sort((a, b) =>
      (a.user?.name ?? "").localeCompare(b.user?.name ?? ""),
    );
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 32, ranksep: 64 });

  for (const d of departments) {
    g.setNode(d.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  const edges: Edge[] = [];
  for (const d of departments) {
    if (d.parentId) {
      g.setEdge(d.parentId, d.id);
      edges.push({
        id: `${d.parentId}->${d.id}`,
        source: d.parentId,
        target: d.id,
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
      });
    }
  }

  dagre.layout(g);

  const nodes: DeptFlowNode[] = departments.map((d) => {
    const pos = g.node(d.id);
    return {
      id: d.id,
      type: "dept",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        name: d.name,
        code: d.code,
        managerName: d.manager?.user?.name ?? null,
        employees: employeesByDept.get(d.id) ?? [],
      },
    };
  });

  return { nodes, edges };
}
