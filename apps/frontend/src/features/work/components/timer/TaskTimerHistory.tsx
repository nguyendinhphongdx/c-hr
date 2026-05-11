"use client";

import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import { useTaskTimers } from "../../hooks/useTaskTimer";
import type { TaskTimer } from "../../types";

interface TaskTimerHistoryProps {
  taskId: string;
}

function fmtHm(minutes: number): string {
  if (!minutes) return "0p";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}p`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function initials(name: string | null | undefined, email: string): string {
  const src = name?.trim() || email;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return src.slice(0, 2).toUpperCase();
}

export function TaskTimerHistory({ taskId }: TaskTimerHistoryProps) {
  const { data, isLoading } = useTaskTimers(taskId);
  const sessions = (data ?? []) as TaskTimer[];

  // Default collapsed when the list is long; expanded otherwise so users
  // see history at-a-glance.
  const [open, setOpen] = useState<boolean>(sessions.length <= 10);

  if (isLoading) {
    return (
      <div className="h-8 animate-pulse rounded bg-muted/40" />
    );
  }
  if (sessions.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
        <span>Lịch sử thời gian ({sessions.length})</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-1.5">
        {sessions.map((s) => {
          const running = s.stoppedAt === null;
          const durLabel = running
            ? "Đang chạy..."
            : s.minutes !== null
              ? fmtHm(s.minutes)
              : "—";
          return (
            <div
              key={s.id}
              className="flex items-start gap-2 rounded border bg-card/40 px-2 py-1.5 text-sm"
            >
              <Avatar className="h-6 w-6">
                {s.user.avatar ? (
                  <AvatarImage src={s.user.avatar} alt={s.user.name ?? ""} />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {initials(s.user.name, s.user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">
                    {s.user.name ?? s.user.email}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums text-xs",
                      running
                        ? "font-medium text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {durLabel}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(s.startedAt), {
                    addSuffix: true,
                    locale: vi,
                  })}
                  {s.note ? (
                    <span className="ml-1.5 italic">· {s.note}</span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
