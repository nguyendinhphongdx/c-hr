import type { ID, ISODate, Nullable } from "@/lib/types";

export type DayStatus =
  | "PRESENT"
  | "LATE"
  | "EARLY_LEAVE"
  | "ABSENT"
  | "WEEKEND";

export interface TimesheetDay {
  date: string; // YYYY-MM-DD
  shift: { name: string; startTime: string; endTime: string } | null;
  checkInAt: Nullable<ISODate>;
  checkOutAt: Nullable<ISODate>;
  status: DayStatus;
}

export interface TimesheetSchedule {
  id: ID;
  name: string;
  shifts: Array<{
    name: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    lateGraceMinutes: number;
  }>;
}

export interface TimesheetResponse {
  year: number;
  month: number;
  workSchedule: Nullable<TimesheetSchedule>;
  days: TimesheetDay[];
}
