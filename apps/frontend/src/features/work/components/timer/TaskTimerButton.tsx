"use client";

import { Play, Square, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  useCurrentTimer,
  useStartTimer,
  useStopTimer,
} from "../../hooks/useTaskTimer";

interface TaskTimerButtonProps {
  taskId: string;
  taskCode: string;
  /** Total minutes already tracked on this task (denormalized cache). */
  loggedMinutes: number | null;
  disabled?: boolean;
}

function formatElapsed(startedAt: string): string {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtHm(minutes: number): string {
  if (!minutes) return "0p";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}p`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Start/Stop button for the currently-open task drawer. Three states:
 *
 *  - No running timer            → green "Bắt đầu"
 *  - Running on THIS task        → red "Dừng" + live mm:ss display
 *  - Running on a DIFFERENT task → "Chuyển sang task này" with confirm
 *
 * The BE auto-stops the previous timer when start() is called for a
 * different task, so the "switch" path just calls start() after confirm.
 */
export function TaskTimerButton({
  taskId,
  taskCode,
  loggedMinutes,
  disabled,
}: TaskTimerButtonProps) {
  const current = useCurrentTimer();
  const start = useStartTimer();
  const stop = useStopTimer();
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
  const [, forceTick] = useState(0);

  const running = current.data ?? null;
  const isRunningThisTask = !!running && running.taskId === taskId;
  const isRunningOtherTask = !!running && running.taskId !== taskId;

  // Tick once per second while running on THIS task — keeps the elapsed
  // display fresh without re-querying the server.
  useEffect(() => {
    if (!isRunningThisTask) return;
    const t = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [isRunningThisTask]);

  const handleStart = async () => {
    try {
      await start.mutateAsync({ taskId });
    } catch (err) {
      toast.error("Không bắt đầu được", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  const handleStop = async () => {
    if (!running) return;
    try {
      await stop.mutateAsync({ id: running.id });
      toast.success("Đã dừng theo dõi");
    } catch (err) {
      toast.error("Không dừng được", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  const handleSwitch = async () => {
    setSwitchConfirmOpen(false);
    await handleStart();
  };

  const pending = start.isPending || stop.isPending;
  const loadingCurrent = current.isLoading;

  return (
    <div className="flex items-center gap-2">
      {loadingCurrent ? (
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      ) : isRunningThisTask && running ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={disabled || pending}
            onClick={handleStop}
          >
            <Square className="mr-1.5 h-3.5 w-3.5" /> Dừng
          </Button>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-mono tabular-nums text-destructive",
            )}
            aria-live="polite"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
            {formatElapsed(running.startedAt)}
          </span>
        </>
      ) : isRunningOtherTask && running ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || pending}
            onClick={() => setSwitchConfirmOpen(true)}
            title={`Đang chạy ${running.task.code} — bấm để chuyển`}
          >
            <Timer className="mr-1.5 h-3.5 w-3.5" /> Chuyển sang task này
          </Button>
          <AlertDialog
            open={switchConfirmOpen}
            onOpenChange={setSwitchConfirmOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Đổi task đang theo dõi?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dừng <span className="font-mono">{running.task.code}</span> và
                  bắt đầu theo dõi <span className="font-mono">{taskCode}</span>?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                <AlertDialogAction onClick={handleSwitch}>
                  Đồng ý
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="default"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={disabled || pending}
          onClick={handleStart}
          title={
            loggedMinutes
              ? `Đã ghi ${fmtHm(loggedMinutes)} trên task này`
              : undefined
          }
        >
          <Play className="mr-1.5 h-3.5 w-3.5" /> Bắt đầu
        </Button>
      )}
      {loggedMinutes && loggedMinutes > 0 ? (
        <span className="text-xs text-muted-foreground">
          Đã ghi {fmtHm(loggedMinutes)}
        </span>
      ) : null}
    </div>
  );
}
