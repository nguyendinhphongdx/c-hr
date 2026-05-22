"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";

import type { Application, JobStage } from "../../types";

import { ApplicationCard } from "./ApplicationCard";

interface PipelineColumnProps {
  stage: JobStage;
  applications: Application[];
  onOpenApplication?: (application: Application) => void;
}

const STAGE_COLOR: Record<string, string> = {
  SOURCED: "border-slate-300 dark:border-slate-700",
  SCREENING: "border-amber-300 dark:border-amber-800",
  INTERVIEW: "border-sky-300 dark:border-sky-800",
  OFFER: "border-violet-300 dark:border-violet-800",
  HIRED: "border-emerald-300 dark:border-emerald-800",
  REJECTED: "border-rose-300 dark:border-rose-800",
};

export function PipelineColumn({
  stage,
  applications,
  onOpenApplication,
}: PipelineColumnProps) {
  const droppable = useDroppable({
    id: stage.id,
    data: { kind: "stage", stageId: stage.id },
  });

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-lg border bg-muted/20">
      <header
        className={cn(
          "flex items-center justify-between border-b border-l-4 bg-background px-3 py-2 rounded-t-lg",
          STAGE_COLOR[stage.kind] ?? "border-l-muted",
        )}
      >
        <span className="text-sm font-medium">{stage.name}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {applications.length}
        </span>
      </header>
      <div
        ref={droppable.setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition-colors",
          droppable.isOver && "bg-accent/30",
        )}
      >
        <SortableContext
          items={applications.map((a) => a.id)}
          strategy={verticalListSortingStrategy}
        >
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onOpen={onOpenApplication}
            />
          ))}
        </SortableContext>
        {applications.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Trống
          </p>
        )}
      </div>
    </div>
  );
}
