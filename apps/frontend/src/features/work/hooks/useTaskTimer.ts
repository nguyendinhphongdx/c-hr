"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { ID } from "@/lib/types";

import { timerService } from "../services/timerService";
import type {
  ListTimersQuery,
  StartTimerInput,
  StopTimerInput,
  SummaryTimersQuery,
} from "../types";

import { taskKeys } from "./useTasks";

export const timerKeys = {
  all: ["task-timers"] as const,
  current: () => ["task-timers", "current"] as const,
  forTask: (taskId: ID) => ["task-timers", "task", taskId] as const,
  list: (q: ListTimersQuery) => ["task-timers", "list", q] as const,
  summary: (q: SummaryTimersQuery) => ["task-timers", "summary", q] as const,
};

/**
 * Polls every 30s so the floating indicator stays roughly accurate
 * across long sessions. The component recomputes elapsed seconds via
 * its own 1s setInterval — the poll is just for "did the timer get
 * stopped from another tab?" sync. Also refetches on visibility change.
 */
export function useCurrentTimer() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: timerKeys.current(),
    queryFn: () => timerService.current(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        qc.invalidateQueries({ queryKey: timerKeys.current() });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [qc]);

  return query;
}

export function useTaskTimers(taskId: ID | null) {
  return useQuery({
    queryKey: taskId ? timerKeys.forTask(taskId) : ["task-timers", "task", "none"],
    queryFn: () => timerService.list({ taskId: taskId as ID }),
    enabled: !!taskId,
  });
}

function invalidateAfterMutation(
  qc: ReturnType<typeof useQueryClient>,
  taskId: ID | undefined,
) {
  qc.invalidateQueries({ queryKey: timerKeys.current() });
  qc.invalidateQueries({ queryKey: taskKeys.all });
  if (taskId) {
    qc.invalidateQueries({ queryKey: timerKeys.forTask(taskId) });
  }
}

export function useStartTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StartTimerInput) => timerService.start(data),
    onSuccess: (timer, vars) => {
      invalidateAfterMutation(qc, vars.taskId ?? timer?.taskId);
    },
  });
}

export function useStopTimer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: ID; data?: StopTimerInput }) =>
      timerService.stop(id, data ?? {}),
    onSuccess: (timer) => {
      invalidateAfterMutation(qc, timer?.taskId);
    },
  });
}
