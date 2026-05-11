import type { ID, ISODate, Nullable } from "@/lib/types";

export interface ProjectReportTotals {
  total: number;
  done: number;
  open: number;
  overdue: number;
  /** done / total, in [0..1]. */
  completionRate: number;
  /** null when no DONE tasks. */
  avgCycleTimeDays: Nullable<number>;
}

export interface BurndownPoint {
  date: string; // YYYY-MM-DD
  openCount: number;
}

export interface WorkloadAssigneeRow {
  /** null = "Chưa giao" bucket. */
  userId: Nullable<ID>;
  name: Nullable<string>;
  avatar: Nullable<string>;
  counts: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
}

export interface ProjectReportOverview {
  totals: ProjectReportTotals;
  burndown: BurndownPoint[];
  workload: WorkloadAssigneeRow[];
}

export interface OrgWorkTotals {
  activeProjects: number;
  openTasks: number;
  overdueTasks: number;
  totalMembers: number;
}

export interface TopProjectRow {
  id: ID;
  name: string;
  slug: string;
  openCount: number;
  updatedAt: ISODate;
}

export interface WorkloadHeatmapRow {
  userId: ID;
  name: Nullable<string>;
  avatar: Nullable<string>;
  counts: number[];
}

export interface WorkloadHeatmap {
  days: string[]; // YYYY-MM-DD, length 14
  rows: WorkloadHeatmapRow[];
}

export interface OrgWorkOverview {
  totals: OrgWorkTotals;
  topProjects: TopProjectRow[];
  workloadHeatmap: WorkloadHeatmap;
}
