import { cn } from "@/lib/utils";

import type { JobStatus } from "../../types";

const STATUS_META: Record<JobStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Bản nháp",
    className: "bg-muted text-muted-foreground",
  },
  PUBLISHED: {
    label: "Đang đăng",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  PAUSED: {
    label: "Tạm dừng",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  CLOSED: {
    label: "Đã đóng",
    className: "bg-muted text-muted-foreground line-through",
  },
  FILLED: {
    label: "Đã tuyển đủ",
    className:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}
