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
  /**
   * OT minutes split per VN labor law buckets — weekday (1.5×),
   * weekend (Sat/Sun, 2.0×), holiday (3.0× per Holiday model). Holiday
   * takes precedence when a weekend day is also marked as a holiday.
   */
  otMinutesWeekday: number;
  otMinutesWeekend: number;
  otMinutesHoliday: number;
  /** Convenience sum across the three buckets. */
  otMinutesTotal: number;
  /** actualWorkdays / standardWorkdays — 0 when no scheduled days. */
  attendanceRate: number;
  /**
   * F8 Phase 7 — sum of TaskTimer minutes for this employee's linked
   * User account over the period (all projects). 0 when no linked User
   * or no work-tracked sessions.
   */
  workMinutes: number;
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
