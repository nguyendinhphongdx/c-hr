"use client";

import { format, isBefore, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import { CheckCircle2, Circle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import type { OnboardingTaskRow } from "../../types";

interface TaskWatchRowProps {
  task: OnboardingTaskRow;
  onOpen: (task: OnboardingTaskRow) => void;
}

/**
 * Read-only row for "Đang theo dõi" tasks on the self-service view —
 * tasks assigned to HR / manager / IT that the new hire watches but can't
 * act on directly. Mirrors TaskChecklistRow's visual rhythm but strips
 * the interactive checkbox + dropdown actions.
 */
export function TaskWatchRow({ task, onOpen }: TaskWatchRowProps) {
  const isDone = task.status === "DONE";
  const overdue =
    !isDone &&
    task.dueDate != null &&
    isBefore(new Date(task.dueDate), startOfDay(new Date()));

  const assignee = task.assignee;

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/30",
        isDone && "opacity-70",
      )}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center"
      >
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground/60" />
        )}
      </span>

      <button
        type="button"
        onClick={() => onOpen(task)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm",
            isDone && "line-through",
          )}
        >
          {task.title}
        </span>
        {task.dueDate && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[11px]",
              overdue
                ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
                : "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
            )}
          >
            {format(new Date(task.dueDate), "dd/MM", { locale: vi })}
          </span>
        )}
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Avatar className="h-6 w-6">
            {assignee?.avatar && (
              <AvatarImage
                src={assignee.avatar}
                alt={assignee.name ?? assignee.email}
              />
            )}
            <AvatarFallback className="text-[10px]">
              {avatarInitials(assignee?.name, assignee?.email)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[8rem] truncate sm:inline">
            {assignee?.name ?? assignee?.email ?? "Chưa giao"}
          </span>
        </span>
      </button>
    </li>
  );
}

function avatarInitials(
  name: string | null | undefined,
  email?: string | null,
): string {
  const source = name && name.trim() ? name : email ?? "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
