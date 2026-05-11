import {
  ArrowDown,
  ChevronsUp,
  Equal,
  type LucideIcon,
  ArrowUp,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { TaskPriority } from "../../types";

const META: Record<
  TaskPriority,
  { label: string; icon: LucideIcon; className: string }
> = {
  LOW: {
    label: "Thấp",
    icon: ArrowDown,
    className: "text-muted-foreground",
  },
  MEDIUM: {
    label: "Trung bình",
    icon: Equal,
    className: "text-foreground/80",
  },
  HIGH: {
    label: "Cao",
    icon: ArrowUp,
    className: "text-amber-600 dark:text-amber-400",
  },
  URGENT: {
    label: "Khẩn",
    icon: ChevronsUp,
    className: "text-red-600 dark:text-red-400",
  },
};

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  iconOnly?: boolean;
  className?: string;
}

export function TaskPriorityBadge({
  priority,
  iconOnly = false,
  className,
}: TaskPriorityBadgeProps) {
  const m = META[priority];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        m.className,
        className,
      )}
      title={m.label}
    >
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && <span>{m.label}</span>}
    </span>
  );
}

export function taskPriorityLabel(priority: TaskPriority): string {
  return META[priority].label;
}
