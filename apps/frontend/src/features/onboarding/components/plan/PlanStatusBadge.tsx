import { cn } from "@/lib/utils";

import type { OnboardingPlanStatus } from "../../types";

const STATUS_LABEL: Record<OnboardingPlanStatus, string> = {
  PENDING: "Chờ bắt đầu",
  IN_PROGRESS: "Đang chạy",
  COMPLETED: "Hoàn thành",
  ARCHIVED: "Đã lưu trữ",
};

const STATUS_CLASS: Record<OnboardingPlanStatus, string> = {
  PENDING: "bg-muted text-muted-foreground border-muted-foreground/20",
  IN_PROGRESS:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  COMPLETED:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900",
  ARCHIVED:
    "bg-muted/60 text-muted-foreground/70 border-muted-foreground/20 line-through",
};

interface PlanStatusBadgeProps {
  status: OnboardingPlanStatus;
  className?: string;
}

export function PlanStatusBadge({ status, className }: PlanStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
