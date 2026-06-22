"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { InvitationStatus } from "../types";

const TONE: Record<InvitationStatus, string> = {
  PENDING:
    "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/40 dark:text-amber-200",
  COMPLETED:
    "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/40 dark:text-emerald-200",
  REJECTED:
    "border-rose-300 bg-rose-100 text-rose-800 dark:border-rose-800/60 dark:bg-rose-900/40 dark:text-rose-200",
  CANCELLED: "border-border bg-muted text-muted-foreground",
  EXPIRED:
    "border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-800/60 dark:bg-orange-900/40 dark:text-orange-200",
};

const LABEL: Record<InvitationStatus, string> = {
  PENDING: "Đang chờ",
  COMPLETED: "Đã hoàn tất",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã huỷ",
  EXPIRED: "Hết hạn",
};

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-5 px-1.5 text-[10px] font-medium", TONE[status])}
    >
      {LABEL[status]}
    </Badge>
  );
}
