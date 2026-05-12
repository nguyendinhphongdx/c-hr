"use client";

import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ClipboardCheck, Eye, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/features/auth";
import type { ID } from "@/lib/types";

import { PlanProgressBar } from "../components/plan/PlanProgressBar";
import { PlanStatusBadge } from "../components/plan/PlanStatusBadge";
import { TaskChecklistRow } from "../components/task/TaskChecklistRow";
import { TaskCompleteDialog } from "../components/task/TaskCompleteDialog";
import { TaskDetailDrawer } from "../components/task/TaskDetailDrawer";
import { TaskReassignDialog } from "../components/task/TaskReassignDialog";
import { TaskWatchRow } from "../components/task/TaskWatchRow";
import { useMyOnboardingPlan } from "../hooks/useOnboardingPlans";
import type { OnboardingTaskRow } from "../types";

/**
 * Self-service onboarding page — `/my-onboarding`.
 *
 * Splits the plan's tasks into two sections:
 *  - "Việc cần bạn làm" — assigned to the current user (interactive)
 *  - "Đang theo dõi"    — assigned to HR/manager/IT (read-only)
 *
 * Empty states surface gracefully when the user has no employee record
 * or no plan yet (instead of 404 errors).
 */
export function MyOnboardingView() {
  const { user, isLoading: authLoading } = useAuth();
  const employeeId = user?.employeeId ?? null;
  const currentUserId = user?.id ?? null;
  const { plan, isLoading, error } = useMyOnboardingPlan(employeeId);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Mirrors the `?taskCode=` pattern in features/work/views/ProjectDetailView —
  // read once on mount so deep links open the drawer; user gestures after that
  // sync via `openTask` / `closeTask`.
  const [detailTaskId, setDetailTaskId] = useState<ID | null>(
    () => searchParams.get("taskId"),
  );
  const [completeTask, setCompleteTask] = useState<OnboardingTaskRow | null>(
    null,
  );
  const [reassignTask, setReassignTask] = useState<OnboardingTaskRow | null>(
    null,
  );

  const openTask = useCallback(
    (id: ID) => {
      setDetailTaskId(id);
      const next = new URLSearchParams(searchParams.toString());
      next.set("taskId", id);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const closeTask = useCallback(() => {
    setDetailTaskId(null);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("taskId");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const { myTasks, watchedTasks, done, total } = useMemo(() => {
    const tasks = plan?.tasks ?? [];
    const mine: OnboardingTaskRow[] = [];
    const watched: OnboardingTaskRow[] = [];
    for (const t of tasks) {
      if (currentUserId && t.assigneeId === currentUserId) mine.push(t);
      else watched.push(t);
    }
    return {
      myTasks: mine,
      watchedTasks: watched,
      done: tasks.filter((t) => t.status === "DONE").length,
      total: tasks.length,
    };
  }, [plan, currentUserId]);

  if (authLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-semibold leading-tight">
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              Việc onboard của tôi
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Theo dõi quá trình tiếp nhận và hoàn thành các nhiệm vụ được giao.
            </p>
          </div>
          {plan && <PlanStatusBadge status={plan.status} />}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {!employeeId ? (
            <EmptyState
              title="Bạn chưa có hồ sơ nhân viên"
              description="Tài khoản của bạn chưa được liên kết với hồ sơ Employee. Liên hệ HR để được thiết lập."
            />
          ) : error ? (
            <EmptyState
              title="Không tải được kế hoạch onboarding"
              description={(error as Error).message}
            />
          ) : !plan ? (
            <EmptyState
              title="Bạn chưa có quy trình onboarding"
              description="HR sẽ tạo quy trình tiếp nhận và giao việc cho bạn trong thời gian tới."
            />
          ) : (
            <>
              {plan.status === "ARCHIVED" && (
                <div className="rounded-md border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Plan đã kết thúc — chỉ xem lại, không thể cập nhật.
                </div>
              )}

              <Card>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Tiến độ
                      </p>
                      <p className="text-2xl font-semibold tabular-nums">
                        {done}
                        <span className="text-base text-muted-foreground">
                          {" "}
                          / {total}
                        </span>{" "}
                        <span className="text-sm text-muted-foreground">
                          nhiệm vụ
                        </span>
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">
                      <p>
                        Bắt đầu:{" "}
                        {plan.startedAt
                          ? format(new Date(plan.startedAt), "dd/MM/yyyy", {
                              locale: vi,
                            })
                          : "—"}
                      </p>
                      <p>
                        Hoàn thành:{" "}
                        {plan.completedAt
                          ? format(new Date(plan.completedAt), "dd/MM/yyyy", {
                              locale: vi,
                            })
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <PlanProgressBar
                    done={done}
                    total={total}
                    size="md"
                    hideLabel
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Mẫu: {plan.templateNameSnapshot}
                  </p>
                </CardContent>
              </Card>

              <section>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Việc cần bạn làm ({myTasks.length})
                </h2>
                {myTasks.length === 0 ? (
                  <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                    Hiện không có nhiệm vụ nào cần bạn xử lý.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {myTasks.map((task) => (
                      <TaskChecklistRow
                        key={task.id}
                        task={task}
                        plan={plan}
                        onOpen={(t) => openTask(t.id)}
                        onComplete={(t) => setCompleteTask(t)}
                        onReassign={(t) => setReassignTask(t)}
                        onEdit={(t) => openTask(t.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>

              {watchedTasks.length > 0 && (
                <section>
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" /> Đang theo dõi (
                    {watchedTasks.length})
                  </h2>
                  <ul className="space-y-2">
                    {watchedTasks.map((task) => (
                      <TaskWatchRow
                        key={task.id}
                        task={task}
                        onOpen={(t) => openTask(t.id)}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      <TaskDetailDrawer
        open={detailTaskId !== null}
        onClose={closeTask}
        taskId={detailTaskId}
        onRequestComplete={(t) => setCompleteTask(t)}
        onRequestReassign={(t) => setReassignTask(t)}
      />

      <TaskCompleteDialog
        task={completeTask}
        open={completeTask !== null}
        onClose={() => setCompleteTask(null)}
      />

      <TaskReassignDialog
        task={reassignTask}
        open={reassignTask !== null}
        onClose={() => setReassignTask(null)}
      />
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-md text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
