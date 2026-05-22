"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Mail, Phone } from "lucide-react";

import { cn } from "@/lib/utils";

import type { Application } from "../../types";

interface ApplicationCardProps {
  application: Application;
  onOpen?: (application: Application) => void;
  draggable?: boolean;
}

export function ApplicationCard({
  application,
  onOpen,
  draggable = true,
}: ApplicationCardProps) {
  const sortable = useSortable({
    id: application.id,
    data: { kind: "application", applicationId: application.id },
    disabled: !draggable,
  });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      {...sortable.attributes}
      {...sortable.listeners}
      onClick={(e) => {
        // Don't open on drag start
        if (sortable.isDragging) return;
        e.stopPropagation();
        onOpen?.(application);
      }}
      className={cn(
        "cursor-grab rounded-md border bg-background p-3 text-sm shadow-sm transition-colors hover:bg-accent/40 active:cursor-grabbing",
        sortable.isDragging && "opacity-30",
        application.withdrawnAt && "opacity-60",
      )}
    >
      <div className="font-medium leading-tight">
        {application.candidate.fullName}
      </div>
      {application.candidate.headline && (
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {application.candidate.headline}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Mail className="h-3 w-3" />
          <span className="truncate">{application.candidate.email}</span>
        </span>
        {application.candidate.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {application.candidate.phone}
          </span>
        )}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        {format(new Date(application.appliedAt), "dd/MM/yyyy", { locale: vi })}
        {application.candidate.source !== "MANUAL" && (
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5">
            {application.candidate.source}
          </span>
        )}
      </div>
    </div>
  );
}
