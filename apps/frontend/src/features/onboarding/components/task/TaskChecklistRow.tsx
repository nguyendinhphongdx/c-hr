"use client";

import { format, isBefore, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CheckCircle2,
  Circle,
  Loader2,
  MoreHorizontal,
  Pencil,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { useUncompleteTask } from "../../hooks/useOnboardingTasks";
import type { OnboardingPlanDetail, OnboardingTaskRow } from "../../types";

interface TaskChecklistRowProps {
  task: OnboardingTaskRow;
  plan: OnboardingPlanDetail;
  onOpen: (task: OnboardingTaskRow) => void;
  onComplete: (task: OnboardingTaskRow) => void;
  onReassign: (task: OnboardingTaskRow) => void;
  onEdit: (task: OnboardingTaskRow) => void;
}

export function TaskChecklistRow({
  task,
  plan,
  onOpen,
  onComplete,
  onReassign,
  onEdit,
}: TaskChecklistRowProps) {
  const uncomplete = useUncompleteTask();
  const [busy, setBusy] = useState(false);

  const isDone = task.status === "DONE";
  // Plan-level canEdit gates HR-only actions (reassign / edit / add). On
  // ARCHIVED plans BE also forbids complete/uncomplete; we let the action
  // fall through but disable the toggle visually.
  const planEditable = plan.view.canEdit;
  const archived = plan.status === "ARCHIVED";

  const overdue =
    !isDone &&
    task.dueDate != null &&
    isBefore(new Date(task.dueDate), startOfDay(new Date()));

  const assignee = task.assignee;
  // Without a richer task ACL we approximate: anyone who can see this row
  // can attempt the toggle, but only HR (planEditable) can do it when not
  // assigned. The drawer fetches the real per-task ACL.
  const toggleEnabled = !archived;

  const handleToggle = async () => {
    if (busy || !toggleEnabled) return;
    if (isDone) {
      setBusy(true);
      try {
        await uncomplete.mutateAsync(task.id);
        toast.success("Đã đánh dấu chưa hoàn thành");
      } catch (err) {
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })
            ?.response?.data?.error?.message ??
          (err instanceof Error ? err.message : "Không cập nhật được");
        toast.error(msg);
      } finally {
        setBusy(false);
      }
    } else {
      onComplete(task);
    }
  };

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/30",
        isDone && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        disabled={!toggleEnabled || busy}
        aria-label={isDone ? "Đánh dấu chưa hoàn thành" : "Hoàn thành"}
        className={cn(
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
          !toggleEnabled && "cursor-not-allowed opacity-50",
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : isDone ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onOpen(task)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
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

      {planEditable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              aria-label="Thao tác"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onReassign(task)}>
              <Users className="mr-2 h-4 w-4" /> Giao lại
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="mr-2 h-4 w-4" /> Sửa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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
