import type { ID, ISODate } from "@/lib/types";

export type AttendanceMode = "FIXED" | "FLEXIBLE";

export interface WorkShift {
  id: ID;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  breakMinutes: number;
  crossesMidnight: boolean;
  mode: AttendanceMode;
  config: Record<string, unknown>;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface WorkSchedule {
  id: ID;
  organizationId: ID;
  name: string;
  /** null = baseline (active from the beginning) */
  effectiveFrom: ISODate | null;
  shifts: WorkShift[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ShiftInput {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  breakMinutes?: number;
  crossesMidnight?: boolean;
  mode?: AttendanceMode;
  /** FIXED only */
  lateGraceMinutes?: number;
  /** FLEXIBLE only */
  windowMinutes?: number;
}

export interface CreateWorkScheduleInput {
  name: string;
  /** ISO-8601. Omit / null = baseline. */
  effectiveFrom?: string | null;
  shifts: ShiftInput[];
}

export interface UpdateWorkScheduleInput {
  name?: string;
  /** null = reset to baseline */
  effectiveFrom?: string | null;
  shifts?: ShiftInput[];
}
