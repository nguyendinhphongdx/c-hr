import type { ID, Nullable } from "@/lib/types";

export interface EmployeeSummaryRow {
  employeeId: ID;
  code: string;
  name: Nullable<string>;
  email: Nullable<string>;
  departmentId: Nullable<ID>;
  departmentName: Nullable<string>;

  /** Days in period where the employee was scheduled to work. */
  standardWorkdays: number;
  /** Days actually checked in (PRESENT + LATE). */
  actualWorkdays: number;
  /** Total minutes between check-in and check-out, summed across the period. */
  totalWorkMinutes: number;
  lateCount: number;
  lateMinutes: number;
  earlyLeaveCount: number;
  earlyLeaveMinutes: number;
  absentDays: number;
  /** OT minutes — single bucket in v1; per-type split deferred to Phase 7. */
  otMinutes: number;
  /** actualWorkdays / standardWorkdays — 0 when no scheduled days. */
  attendanceRate: number;
}

export interface TimesheetSummaryQuery {
  /** YYYY-MM-DD */
  from: string;
  to: string;
  departmentId?: ID;
  q?: string;
}

export interface OverviewTotals {
  activeEmployees: number;
  totalWorkMinutes: number;
  totalOTMinutes: number;
  attendanceRate: number;
}

export interface OverviewTrendPoint {
  /** YYYY-MM */
  month: string;
  totalWorkMinutes: number;
  totalOTMinutes: number;
}

export interface OverviewTopRow {
  employeeId: ID;
  code: string;
  name: Nullable<string>;
  value: number;
  detail?: number;
}

export interface OverviewResponse {
  totals: OverviewTotals;
  trend: OverviewTrendPoint[];
  topLate: OverviewTopRow[];
  topAbsent: OverviewTopRow[];
}
