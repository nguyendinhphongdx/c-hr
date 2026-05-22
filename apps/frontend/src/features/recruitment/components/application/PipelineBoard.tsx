"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";

import type { ID } from "@/lib/types";

import {
  useApplications,
  useMoveApplicationStage,
} from "../../hooks/useApplications";
import type { Application, JobStage } from "../../types";

import { ApplicationCard } from "./ApplicationCard";
import { PipelineColumn } from "./PipelineColumn";

interface PipelineBoardProps {
  jobId: ID;
  stages: JobStage[];
  onOpenApplication?: (application: Application) => void;
}

export function PipelineBoard({
  jobId,
  stages,
  onOpenApplication,
}: PipelineBoardProps) {
  const appsQuery = useApplications({ jobId });
  const moveStage = useMoveApplicationStage();
  const [activeApp, setActiveApp] = useState<Application | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const byStage = useMemo(() => {
    const m = new Map<ID, Application[]>();
    for (const s of stages) m.set(s.id, []);
    for (const a of appsQuery.data ?? []) {
      const arr = m.get(a.stageId) ?? [];
      arr.push(a);
      m.set(a.stageId, arr);
    }
    return m;
  }, [appsQuery.data, stages]);

  const handleDragStart = (e: DragStartEvent) => {
    const id = e.active.id as ID;
    const app = (appsQuery.data ?? []).find((a) => a.id === id);
    if (app) setActiveApp(app);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveApp(null);
    const { active, over } = e;
    if (!over) return;
    const appId = active.id as ID;
    const app = (appsQuery.data ?? []).find((a) => a.id === appId);
    if (!app) return;

    // Drop target is either a stage column (kind: 'stage') or another card
    // (in which case we resolve its parent stage).
    const overData = over.data.current as
      | { kind?: "stage" | "application"; stageId?: ID; applicationId?: ID }
      | undefined;
    let targetStageId: ID | null = null;
    if (overData?.kind === "stage" && overData.stageId) {
      targetStageId = overData.stageId;
    } else {
      const overApp = (appsQuery.data ?? []).find((a) => a.id === over.id);
      if (overApp) targetStageId = overApp.stageId;
    }
    if (!targetStageId || targetStageId === app.stageId) return;
    moveStage.mutate({ id: appId, data: { stageId: targetStageId } });
  };

  if (appsQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Đang tải…</div>
    );
  }
  if (appsQuery.error) {
    return (
      <div className="p-6 text-sm text-destructive">
        Lỗi: {(appsQuery.error as Error).message}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveApp(null)}
    >
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto p-3">
        {stages.map((stage) => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            applications={byStage.get(stage.id) ?? []}
            onOpenApplication={onOpenApplication}
          />
        ))}
      </div>

      <DragOverlay>
        {activeApp ? (
          <div className="w-72 rotate-2">
            <ApplicationCard application={activeApp} draggable={false} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
