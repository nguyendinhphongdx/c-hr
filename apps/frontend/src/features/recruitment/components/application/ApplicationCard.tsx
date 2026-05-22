"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CheckCircle2,
  Mail,
  MailPlus,
  Phone,
  UserPlus,
} from "lucide-react";

import { cn } from "@/lib/utils";

import type { Application } from "../../types";

import { MatchScoreBadge } from "./MatchScoreBadge";

interface ApplicationCardProps {
  application: Application;
  onOpen?: (application: Application) => void;
  /** Show "Tạo nhân viên" button (HIRED-stage cards w/ no employeeId). */
  onHire?: (application: Application) => void;
  /** Show "Gửi email" button — opens SendEmailDialog. */
  onEmail?: (application: Application) => void;
  draggable?: boolean;
}

export function ApplicationCard({
  application,
  onOpen,
  onHire,
  onEmail,
  draggable = true,
}: ApplicationCardProps) {
  const isHired = !!application.candidate.employeeId;
  const emailsSent = application.emails?.length ?? 0;
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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 font-medium leading-tight">
          {application.candidate.fullName}
        </div>
        <MatchScoreBadge
          score={application.matchScore}
          breakdown={application.matchBreakdown}
          compact
        />
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
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {format(new Date(application.appliedAt), "dd/MM/yyyy", { locale: vi })}
        </span>
        {application.candidate.source !== "MANUAL" && (
          <span className="rounded bg-muted px-1.5 py-0.5">
            {application.candidate.source}
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {isHired && (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Đã là nhân viên
          </span>
        )}
        {!isHired && onHire && application.stage.kind === "HIRED" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onHire(application);
            }}
            className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground hover:opacity-90"
          >
            <UserPlus className="h-3 w-3" />
            Chuyển thành nhân viên
          </button>
        )}
        {onEmail && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEmail(application);
            }}
            className="inline-flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-accent/40"
          >
            <MailPlus className="h-3 w-3" />
            Gửi email
            {emailsSent > 0 && (
              <span className="rounded-full bg-muted px-1 text-[9px] text-muted-foreground">
                {emailsSent}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
