import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { ProjectStatus } from "../../types";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Lên kế hoạch",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  DONE: "Hoàn thành",
};

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  PLANNING: "border-sky-200 bg-sky-50 text-sky-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PAUSED: "border-amber-200 bg-amber-50 text-amber-700",
  DONE: "border-slate-200 bg-slate-100 text-slate-700",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={cn("text-xs", STATUS_CLASSES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
