"use client";

import { ArrowRight } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ApprovalFlowStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

interface PartyRef {
  name: string;
  avatar?: string | null;
}

interface ApprovalFlowProps {
  requester: PartyRef;
  approver: PartyRef | null;
  status: ApprovalFlowStatus;
  size?: "sm" | "md";
}

const STATUS_BADGE_CLASSES: Record<ApprovalFlowStatus, string> = {
  PENDING:
    "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800/60 dark:bg-amber-900/40 dark:text-amber-300",
  APPROVED:
    "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-900/40 dark:text-emerald-300",
  REJECTED:
    "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800/60 dark:bg-rose-900/40 dark:text-rose-300",
  CANCELLED:
    "border-border bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<ApprovalFlowStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã huỷ",
};

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function ApprovalFlow({
  requester,
  approver,
  status,
  size = "md",
}: ApprovalFlowProps) {
  const avatarClass = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  const labelClass = size === "sm" ? "text-xs" : "text-sm";
  // List rows reuse this component with size="sm" — at that size names
  // can blow out the row width, so we hide labels and rely on the
  // tooltip-on-avatar to surface them on hover.
  const showLabels = size !== "sm";

  const requesterAvatar = (
    <Avatar className={avatarClass}>
      {requester.avatar ? (
        <AvatarImage src={requester.avatar} alt={requester.name} />
      ) : null}
      <AvatarFallback>{initials(requester.name)}</AvatarFallback>
    </Avatar>
  );

  const approverName = approver?.name ?? "Chưa có người duyệt";
  const approverAvatar = (
    <Avatar className={avatarClass}>
      {approver?.avatar ? (
        <AvatarImage src={approver.avatar} alt={approver.name} />
      ) : null}
      <AvatarFallback>
        {approver ? initials(approver.name) : "?"}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <div className="inline-flex items-center gap-2">
      <div className="flex items-center gap-2">
        {showLabels ? (
          requesterAvatar
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>{requesterAvatar}</TooltipTrigger>
            <TooltipContent>{requester.name}</TooltipContent>
          </Tooltip>
        )}
        {showLabels && (
          <span className={cn("font-medium truncate", labelClass)}>
            {requester.name}
          </span>
        )}
      </div>

      <ArrowRight className="size-4 text-muted-foreground shrink-0" />

      <div className="flex items-center gap-2">
        {showLabels ? (
          approverAvatar
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>{approverAvatar}</TooltipTrigger>
            <TooltipContent>{approverName}</TooltipContent>
          </Tooltip>
        )}
        {showLabels && (
          <span className={cn("font-medium truncate", labelClass)}>
            {approverName}
          </span>
        )}
      </div>

      <span
        className={cn(
          "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium",
          STATUS_BADGE_CLASSES[status],
        )}
      >
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}
