"use client";

import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsAppAdmin } from "@/features/auth";
import { cn } from "@/lib/utils";

import { useDepartmentTree } from "../hooks/useDepartments";
import type { DepartmentNode } from "../types";

export function DepartmentTreeView() {
  const canManage = useIsAppAdmin("HRM");
  const { tree, isLoading, error } = useDepartmentTree();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Org structure — nested by parent. HRM admins can add / re-parent.
          </p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/departments/new" className="gap-2">
              <Plus className="h-4 w-4" />
              New department
            </Link>
          </Button>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderTree className="h-4 w-4" /> Tree
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <p className="py-6 text-sm text-destructive">
              Couldn&apos;t load departments.
            </p>
          ) : tree.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No departments yet.{" "}
              {canManage && (
                <Link
                  href="/departments/new"
                  className="text-foreground underline hover:no-underline"
                >
                  Create the first one
                </Link>
              )}
              .
            </p>
          ) : (
            <ul className="space-y-1">
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  canEdit={canManage}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TreeNode({
  node,
  depth,
  canEdit,
}: {
  node: DepartmentNode;
  depth: number;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40",
          depth > 0 && "ml-4",
        )}
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((s) => !s)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="inline-block w-3.5" />
        )}
        <span className="text-sm font-medium">{node.name}</span>
        {node.code && (
          <span className="font-mono text-xs text-muted-foreground">
            ({node.code})
          </span>
        )}
        {node.manager && (
          <span className="text-xs text-muted-foreground">
            · {node.manager.firstName} {node.manager.lastName}
          </span>
        )}
        {canEdit && (
          <Link
            href={`/departments/${node.id}/edit`}
            className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            aria-label={`Edit ${node.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="space-y-1">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              canEdit={canEdit}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
