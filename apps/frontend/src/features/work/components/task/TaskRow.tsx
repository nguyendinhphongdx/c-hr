"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDashed,
  CircleDot,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";

import { TableCell, TableRow } from "@/components/ui/table";
import { TagBadge } from "@/features/tags";
import { cn } from "@/lib/utils";

import type { TaskListItem, TaskStatus } from "../../types";
import { TaskAssigneeAvatar } from "./TaskAssigneeAvatar";
import { TaskPriorityBadge } from "./TaskPriorityBadge";

export const STATUS_ICON: Record<
  TaskStatus,
  { Icon: typeof Circle; className: string }
> = {
  TODO: { Icon: Circle, className: "text-muted-foreground" },
  IN_PROGRESS: { Icon: CircleDot, className: "text-blue-500" },
  REVIEW: { Icon: CircleDashed, className: "text-amber-500" },
  DONE: { Icon: CheckCircle2, className: "text-emerald-500" },
  CANCELLED: { Icon: XCircle, className: "text-muted-foreground/60" },
};

const STATUS_CYCLE: TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
];

interface TaskRowProps {
  task: TaskListItem;
  onOpen: (task: TaskListItem) => void;
  onCycleStatus: (task: TaskListItem) => void;
  /** Render a project chip before the title (used by cross-project My Tasks view). */
  showProject?: boolean;
  /** Visual nesting depth — 0 = root, 1+ = subtask. Used by TaskListTab when
   *  rendering subtasks beneath their expanded parent. */
  depth?: number;
  /** When defined, the row shows a chevron toggle next to the subtask badge.
   *  Pass `undefined` to hide the chevron (leaf row or no subtasks). */
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function TaskRow({
  task,
  onOpen,
  onCycleStatus,
  showProject,
  depth = 0,
  isExpanded,
  onToggleExpand,
}: TaskRowProps) {
  const { Icon, className: iconClass } = STATUS_ICON[task.status];
  const tagsShown = useMemo(() => task.tags.slice(0, 2), [task.tags]);
  const tagOverflow = task.tags.length - tagsShown.length;

  return (
    <TableRow
      className={cn(
        "cursor-pointer transition-colors hover:bg-accent/40",
        task.status === "CANCELLED" && "opacity-60",
        depth > 0 && "bg-muted/20",
      )}
      onClick={() => onOpen(task)}
    >
      <TableCell
        className="w-8 py-1.5 pr-0"
        style={{ paddingLeft: `${8 + depth * 24}px` }}
      >
        <button
          type="button"
          aria-label="Đổi trạng thái"
          onClick={(e) => {
            e.stopPropagation();
            onCycleStatus(task);
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
        >
          <Icon className={cn("h-4 w-4", iconClass)} />
        </button>
      </TableCell>
      <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">
        {task.code}
      </TableCell>
      {showProject && (
        <TableCell className="py-1.5">
          <span
            className="inline-flex max-w-45 items-center gap-1 truncate rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            title={task.project.name}
          >
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: task.project.color ?? "#94a3b8" }}
            />
            <span className="truncate">{task.project.name}</span>
          </span>
        </TableCell>
      )}
      <TableCell className="py-1.5">
        <span
          className={cn(
            "font-medium",
            (task.status === "DONE" || task.status === "CANCELLED") &&
              "line-through",
          )}
        >
          {task.title}
        </span>
        {task._count.subtasks > 0 && onToggleExpand ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            aria-label={isExpanded ? "Thu gọn subtask" : "Mở subtask"}
            aria-expanded={isExpanded}
            className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {task._count.subtasks} subtask
          </button>
        ) : (
          task._count.subtasks > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {task._count.subtasks} subtask
            </span>
          )
        )}
      </TableCell>
      <TableCell className="py-1.5">
        <TaskPriorityBadge priority={task.priority} iconOnly />
      </TableCell>
      <TableCell className="py-1.5">
        <TaskAssigneeAvatar user={task.assignee} />
      </TableCell>
      <TableCell className="py-1.5 text-xs text-muted-foreground">
        {task.dueDate
          ? format(new Date(task.dueDate), "dd/MM/yyyy", { locale: vi })
          : "—"}
      </TableCell>
      <TableCell className="py-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {tagsShown.map((t) => (
            <TagBadge key={t.id} tag={t} size="sm" />
          ))}
          {tagOverflow > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{tagOverflow}
            </span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function cycleStatus(current: TaskStatus): TaskStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  if (idx < 0) return "TODO";
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}
