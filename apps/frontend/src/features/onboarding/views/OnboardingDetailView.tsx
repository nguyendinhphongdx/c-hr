"use client";

import { Loader2, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ID } from "@/lib/types";

import { PlanHeader } from "../components/plan/PlanHeader";
import { TaskAddDialog } from "../components/task/TaskAddDialog";
import { TaskChecklistRow } from "../components/task/TaskChecklistRow";
import { TaskCompleteDialog } from "../components/task/TaskCompleteDialog";
import { TaskDetailDrawer } from "../components/task/TaskDetailDrawer";
import { TaskReassignDialog } from "../components/task/TaskReassignDialog";
import { usePlan } from "../hooks/useOnboardingPlans";
import type { OnboardingTaskRow } from "../types";

interface OnboardingDetailViewProps {
  planId: ID;
}

export function OnboardingDetailView({ planId }: OnboardingDetailViewProps) {
  const { data: plan, isLoading, error } = usePlan(planId);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Mirrors the `?taskCode=` pattern in features/work/views/ProjectDetailView —
  // read once on mount so deep links open the drawer; user gestures after that
  // sync via `setSelectedTaskId` below.
  const [detailTaskId, setDetailTaskId] = useState<ID | null>(
    () => searchParams.get("taskId"),
  );
  const [completeTask, setCompleteTask] = useState<OnboardingTaskRow | null>(
    null,
  );
  const [reassignTask, setReassignTask] = useState<OnboardingTaskRow | null>(
    null,
  );
  const [addOpen, setAddOpen] = useState(false);

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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang tải…
      </div>
    );
  }
  if (error || !plan) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        {error
          ? `Lỗi: ${(error as Error).message}`
          : "Không tìm thấy kế hoạch này"}
      </div>
    );
  }

  const canEdit = plan.view.canEdit;

  return (
    <div className="flex h-full flex-col">
      <PlanHeader plan={plan} />

      <div className="flex-1 overflow-y-auto p-6">
        <section className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Nhiệm vụ ({plan.tasks.length})
            </h2>
          </div>

          {plan.tasks.length === 0 ? (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Chưa có nhiệm vụ nào trong kế hoạch này.
            </p>
          ) : (
            <ul className="space-y-2">
              {plan.tasks.map((task) => (
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

          {canEdit && (
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="mr-1 h-4 w-4" /> Thêm nhiệm vụ
              </Button>
            </div>
          )}
        </section>
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

      {canEdit && (
        <TaskAddDialog
          planId={plan.id}
          open={addOpen}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
