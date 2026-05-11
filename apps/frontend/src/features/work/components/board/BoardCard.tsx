"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { GitFork } from "lucide-react";
import { useMemo, type CSSProperties } from "react";

import { TagBadge } from "@/features/tags";
import { cn } from "@/lib/utils";

import type { TaskListItem } from "../../types";
import { TaskAssigneeAvatar } from "../task/TaskAssigneeAvatar";
import { TaskPriorityBadge } from "../task/TaskPriorityBadge";

interface BoardCardProps {
  task: TaskListItem;
  onOpen: (code: string) => void;
}

export function BoardCard({ task, onOpen }: BoardCardProps) {
  const sortable = useSortable({
    id: task.id,
    data: { kind: "task", taskId: task.id, sectionId: task.sectionId },
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tagsShown = useMemo(() => task.tags.slice(0, 2), [task.tags]);
  const tagOverflow = task.tags.length - tagsShown.length;
  const cancelled = task.status === "CANCELLED";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onOpen(task.code);
      }}
      className={cn(
        "group cursor-grab rounded-md border bg-background p-2.5 text-sm shadow-sm transition-colors hover:border-primary/40 active:cursor-grabbing",
        isDragging && "opacity-50",
        cancelled && "opacity-60",
      )}
    >
      {(tagsShown.length > 0 || tagOverflow > 0) && (
        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          {tagsShown.map((t) => (
            <TagBadge key={t.id} tag={t} size="sm" />
          ))}
          {tagOverflow > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{tagOverflow}
            </span>
          )}
        </div>
      )}

      <p
        className={cn(
          "line-clamp-2 font-semibold leading-snug",
          cancelled && "line-through",
        )}
      >
        {task.title}
      </p>

      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono text-[10px]">{task.code}</span>
        <span>·</span>
        <TaskPriorityBadge priority={task.priority} iconOnly />
        {task._count.subtasks > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[10px]">
            <GitFork className="h-3 w-3" /> {task._count.subtasks}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5">
          {task.dueDate && (
            <span className="text-[10px]">
              {format(new Date(task.dueDate), "dd/MM", { locale: vi })}
            </span>
          )}
          <TaskAssigneeAvatar user={task.assignee} />
        </span>
      </div>
    </div>
  );
}
