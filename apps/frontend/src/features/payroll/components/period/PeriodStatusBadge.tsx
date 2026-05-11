"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { PayrollStatus } from "../../types";

const STYLES: Record<
  PayrollStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Nháp",
    className: "bg-muted text-muted-foreground hover:bg-muted",
  },
  CLOSED: {
    label: "Đã đóng",
    className:
      "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300",
  },
  PAID: {
    label: "Đã trả",
    className:
      "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
};

interface PeriodStatusBadgeProps {
  status: PayrollStatus;
  className?: string;
}

export function PeriodStatusBadge({
  status,
  className,
}: PeriodStatusBadgeProps) {
  const s = STYLES[status];
  return (
    <Badge variant="secondary" className={cn(s.className, className)}>
      {s.label}
    </Badge>
  );
}
