import type { ID, ISODate } from "@/lib/types";

export interface WorkShift {
  id: ID;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  breakMinutes: number;
  lateGraceMinutes: number;
  crossesMidnight: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface WorkSchedule {
  id: ID;
  organizationId: ID;
  name: string;
  isDefault: boolean;
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
  lateGraceMinutes?: number;
  crossesMidnight?: boolean;
}

export interface CreateWorkScheduleInput {
  name: string;
  isDefault?: boolean;
  shifts: ShiftInput[];
}

export interface UpdateWorkScheduleInput {
  name?: string;
  isDefault?: boolean;
  shifts?: ShiftInput[];
}
