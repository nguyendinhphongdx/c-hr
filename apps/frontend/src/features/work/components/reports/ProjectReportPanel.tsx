"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListTodo,
  Loader2,
} from "lucide-react";

import type { ID } from "@/lib/types";

import { useProjectOverview } from "../../hooks/useReports";

import { BurndownChart } from "./BurndownChart";
import { KpiCard } from "./KpiCard";
import { WorkloadByAssignee } from "./WorkloadByAssignee";

interface ProjectReportPanelProps {
  projectId: ID;
}

function fmtPct(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

function fmtDays(d: number | null): string {
  if (d === null) return "—";
  if (d < 1) return `${(d * 24).toFixed(1)} giờ`;
  return `${d.toFixed(1)} ngày`;
}

export function ProjectReportPanel({ projectId }: ProjectReportPanelProps) {
  const { data, isLoading, error } = useProjectOverview(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Không tải được báo cáo: {(error as Error).message}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Chưa có dữ liệu báo cáo.
      </div>
    );
  }

  const { totals, burndown, workload } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={ListTodo}
          label="Tổng số task"
          value={String(totals.total)}
          hint={`${totals.open} đang mở`}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Tỷ lệ hoàn thành"
          value={fmtPct(totals.completionRate)}
          hint={`${totals.done} / ${totals.total}`}
          tone="success"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Quá hạn"
          value={String(totals.overdue)}
          hint={totals.overdue > 0 ? "Cần xử lý gấp" : "Không có task quá hạn"}
          tone={totals.overdue > 0 ? "warning" : "muted"}
        />
        <KpiCard
          icon={Clock}
          label="Thời gian xử lý TB"
          value={fmtDays(totals.avgCycleTimeDays)}
          hint="Trung bình từ tạo → xong"
        />
      </div>

      <BurndownChart data={burndown} />

      <WorkloadByAssignee rows={workload} />
    </div>
  );
}
