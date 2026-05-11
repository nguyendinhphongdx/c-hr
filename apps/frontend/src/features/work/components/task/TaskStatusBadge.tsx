import { cn } from "@/lib/utils";

import type { TaskStatus } from "../../types";

const LABELS: Record<TaskStatus, string> = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  REVIEW: "Đang xem xét",
  DONE: "Hoàn thành",
  CANCELLED: "Đã huỷ",
};

const COLORS: Record<TaskStatus, string> = {
  TODO: "bg-muted text-muted-foreground border-border",
  IN_PROGRESS: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  REVIEW: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  DONE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  CANCELLED:
    "bg-muted/40 text-muted-foreground border-border line-through",
};

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: "sm" | "md";
  className?: string;
}

export function TaskStatusBadge({
  status,
  size = "md",
  className,
}: TaskStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium leading-none",
        size === "sm"
          ? "px-1.5 py-0.5 text-[10px]"
          : "px-2 py-0.5 text-xs",
        COLORS[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}

export function taskStatusLabel(status: TaskStatus): string {
  return LABELS[status];
}
