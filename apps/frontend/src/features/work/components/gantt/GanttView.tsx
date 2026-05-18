"use client";

import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  isWeekend,
  startOfDay,
} from "date-fns";
import { vi } from "date-fns/locale";
import { useMemo } from "react";

import type { ID } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useTasks } from "../../hooks/useTasks";
import type { TaskListItem, TaskStatus } from "../../types";

interface GanttViewProps {
  projectId: ID;
  onOpenTask: (code: string) => void;
}

const DAY_WIDTH = 36;
const ROW_HEIGHT = 36;
const LEFT_COL_WIDTH = 280;

const STATUS_BAR_COLOR: Record<TaskStatus, string> = {
  TODO: "bg-slate-400 dark:bg-slate-500",
  IN_PROGRESS: "bg-blue-500",
  REVIEW: "bg-amber-500",
  DONE: "bg-emerald-500",
  CANCELLED: "bg-muted-foreground/40",
};

interface Span {
  task: TaskListItem;
  start: Date;
  end: Date;
}

function resolveSpan(task: TaskListItem): Span | null {
  const start = task.startDate ? startOfDay(new Date(task.startDate)) : null;
  const due = task.dueDate ? startOfDay(new Date(task.dueDate)) : null;
  if (!start && !due) return null;
  const s = start ?? due!;
  const e = due ?? start!;
  if (e < s) return { task, start: e, end: s };
  return { task, start: s, end: e };
}

export function GanttView({ projectId, onOpenTask }: GanttViewProps) {
  const tasksQuery = useTasks({ projectId, includeDone: true });

  const { spans, missing, timelineStart, days } = useMemo(() => {
    const all = tasksQuery.data ?? [];
    const rootTasks = all.filter((t) => !t.parentTaskId);
    const withSpan: Span[] = [];
    const noDate: TaskListItem[] = [];
    for (const t of rootTasks) {
      const s = resolveSpan(t);
      if (s) withSpan.push(s);
      else noDate.push(t);
    }

    const today = startOfDay(new Date());

    if (withSpan.length === 0) {
      // Empty timeline = still show 30 days from today so the grid renders.
      return {
        spans: [],
        missing: noDate,
        timelineStart: addDays(today, -3),
        days: 34,
      };
    }

    let minDate = withSpan[0].start;
    let maxDate = withSpan[0].end;
    for (const sp of withSpan) {
      if (sp.start < minDate) minDate = sp.start;
      if (sp.end > maxDate) maxDate = sp.end;
    }
    // Always include today and at least 30 days forward so a single
    // same-day task doesn't collapse the timeline. Pad 3 days before.
    const earliest = minDate < today ? minDate : today;
    const horizon = addDays(today, 30);
    const latest = maxDate > horizon ? maxDate : horizon;
    const start = addDays(earliest, -3);
    const end = addDays(latest, 3);
    const span = differenceInCalendarDays(end, start) + 1;

    withSpan.sort((a, b) => a.start.getTime() - b.start.getTime());

    return {
      spans: withSpan,
      missing: noDate,
      timelineStart: start,
      days: span,
    };
  }, [tasksQuery.data]);

  if (tasksQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>
    );
  }
  if (tasksQuery.error) {
    return (
      <div className="p-6 text-sm text-destructive">
        Lỗi: {(tasksQuery.error as Error).message}
      </div>
    );
  }

  const today = startOfDay(new Date());
  const todayOffset = differenceInCalendarDays(today, timelineStart);
  const todayInRange = todayOffset >= 0 && todayOffset < days;
  const totalWidth = days * DAY_WIDTH;

  return (
    <div className="flex h-full flex-col">
      {spans.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          Chưa có task nào có ngày bắt đầu hoặc hạn chót.
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `${LEFT_COL_WIDTH}px ${totalWidth}px`,
            }}
          >
            {/* Header row */}
            <div className="sticky left-0 top-0 z-30 flex items-center border-b border-r bg-background px-3 py-2 text-xs font-medium">
              Task ({spans.length})
            </div>
            <div
              className="sticky top-0 z-20 grid bg-background"
              style={{
                gridTemplateColumns: `repeat(${days}, ${DAY_WIDTH}px)`,
              }}
            >
              {Array.from({ length: days }).map((_, i) => {
                const day = addDays(timelineStart, i);
                const isToday = isSameDay(day, today);
                const dim = isWeekend(day);
                const isFirstOfMonth = day.getDate() === 1 || i === 0;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col items-center border-b border-r py-1 text-[10px] leading-tight",
                      dim && "bg-muted/30",
                      isToday && "bg-amber-100 dark:bg-amber-900/40",
                      isFirstOfMonth && "border-l-2 border-l-foreground/40",
                    )}
                  >
                    <span className="font-medium text-muted-foreground">
                      {format(day, "EEE", { locale: vi }).replace(".", "")}
                    </span>
                    <span
                      className={cn(
                        "font-mono",
                        isToday && "font-bold text-amber-700 dark:text-amber-300",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {isFirstOfMonth && (
                      <span className="text-[9px] text-muted-foreground">
                        {format(day, "MM/yy")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Task rows */}
            {spans.map((sp) => {
              const offset = differenceInCalendarDays(sp.start, timelineStart);
              const width =
                (differenceInCalendarDays(sp.end, sp.start) + 1) * DAY_WIDTH;
              return (
                <GanttRow
                  key={sp.task.id}
                  span={sp}
                  offset={offset}
                  width={width}
                  days={days}
                  todayOffset={todayInRange ? todayOffset : null}
                  timelineStart={timelineStart}
                  onOpenTask={onOpenTask}
                />
              );
            })}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <details className="shrink-0 border-t bg-muted/30 px-4 py-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            {missing.length} task chưa có ngày — không hiển thị trên Gantt
          </summary>
          <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
            {missing.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onOpenTask(t.code)}
                  className="flex w-full items-center gap-2 truncate rounded px-2 py-1 text-left hover:bg-accent/40"
                >
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {t.code}
                  </span>
                  <span className="truncate">{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

interface GanttRowProps {
  span: Span;
  offset: number;
  width: number;
  days: number;
  todayOffset: number | null;
  timelineStart: Date;
  onOpenTask: (code: string) => void;
}

function GanttRow({
  span,
  offset,
  width,
  days,
  todayOffset,
  timelineStart,
  onOpenTask,
}: GanttRowProps) {
  const { task } = span;
  const isClosed = task.status === "DONE" || task.status === "CANCELLED";
  return (
    <>
      <div
        className={cn(
          "sticky left-0 z-10 flex items-center gap-2 border-b border-r bg-background px-3",
          isClosed && "opacity-60",
        )}
        style={{ height: ROW_HEIGHT }}
      >
        <button
          type="button"
          onClick={() => onOpenTask(task.code)}
          className="flex min-w-0 flex-1 items-center gap-2 truncate text-left text-xs hover:underline"
        >
          <span className="font-mono text-[10px] text-muted-foreground">
            {task.code}
          </span>
          <span
            className={cn(
              "truncate",
              isClosed && "line-through",
            )}
          >
            {task.title}
          </span>
        </button>
      </div>
      <div
        className="relative border-b"
        style={{ height: ROW_HEIGHT }}
      >
        {/* Day grid background */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${days}, ${DAY_WIDTH}px)`,
          }}
        >
          {Array.from({ length: days }).map((_, i) => {
            const day = addDays(timelineStart, i);
            return (
              <div
                key={i}
                className={cn(
                  "border-r",
                  isWeekend(day) && "bg-muted/20",
                )}
              />
            );
          })}
        </div>
        {/* Today line */}
        {todayOffset !== null && (
          <div
            className="absolute top-0 z-10 h-full w-px bg-amber-500"
            style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
          />
        )}
        {/* Bar */}
        <button
          type="button"
          onClick={() => onOpenTask(task.code)}
          title={`${task.code} · ${task.title}\n${format(span.start, "dd/MM/yyyy")} → ${format(span.end, "dd/MM/yyyy")}`}
          className={cn(
            "absolute top-1.5 h-7 rounded-md border border-black/10 px-2 text-left text-[11px] font-medium text-white shadow-sm transition-all hover:brightness-95",
            STATUS_BAR_COLOR[task.status],
            isClosed && "opacity-70",
          )}
          style={{
            left: offset * DAY_WIDTH + 2,
            width: Math.max(width - 4, DAY_WIDTH - 4),
          }}
        >
          <span className="block truncate">{task.title}</span>
        </button>
      </div>
    </>
  );
}
