"use client";

import { useRouter } from "next/navigation";
import { Square, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useCurrentTimer, useStopTimer } from "../../hooks/useTaskTimer";

function formatElapsed(startedAt: string): string {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Cross-page floating indicator — sticky bottom bar, always visible
 * while a timer is running. Click on the title chunk navigates to the
 * project page with `?taskCode=X` so the drawer auto-opens. The Dừng
 * button stops the running timer.
 *
 * Rendered once at the DashboardShell root; mounts no markup at all
 * when no timer is running.
 */
export function RunningTimerBar() {
  const router = useRouter();
  const current = useCurrentTimer();
  const stop = useStopTimer();
  const [, forceTick] = useState(0);

  const running = current.data ?? null;

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  if (!running) return null;

  const onOpen = () => {
    const slug = running.task.project?.slug;
    if (!slug) return;
    router.push(
      `/work/projects/${slug}?taskCode=${encodeURIComponent(running.task.code)}`,
    );
  };

  const onStop = async () => {
    try {
      await stop.mutateAsync({ id: running.id });
      toast.success("Đã dừng theo dõi");
    } catch (err) {
      toast.error("Không dừng được", {
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
      });
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-3xl items-center gap-3 rounded-full border bg-background/95 px-3 py-1.5 shadow-lg backdrop-blur">
        <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 items-center gap-2 text-left text-sm hover:text-primary"
          title="Mở task"
        >
          <Timer className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="font-mono text-xs text-muted-foreground">
            {running.task.code}
          </span>
          <span className="truncate font-medium">
            {running.task.title}
          </span>
          {running.task.project?.name ? (
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">
              · {running.task.project.name}
            </span>
          ) : null}
        </button>
        <span className="font-mono tabular-nums text-sm">
          {formatElapsed(running.startedAt)}
        </span>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="h-7 px-3"
          onClick={onStop}
          disabled={stop.isPending}
        >
          <Square className="mr-1 h-3 w-3" /> Dừng
        </Button>
      </div>
    </div>
  );
}
