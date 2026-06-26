/**
 * Pure helpers shared by TimesheetService (per-employee view) and
 * TimesheetReportService (bulk aggregation). Keeping them here prevents the
 * two services from drifting apart when attendance rules change.
 */

export type DayStatus = 'PRESENT' | 'LATE' | 'EARLY_LEAVE' | 'ABSENT' | 'WEEKEND';

export interface ShiftLike {
  name: string;
  startTime: string;      // "HH:MM" 24h
  endTime: string;        // "HH:MM" 24h
  daysOfWeek: number[];
  breakMinutes: number;
  crossesMidnight: boolean;
  mode: string;           // 'FIXED' | 'FLEXIBLE'
  config: Record<string, unknown>;
}

export interface ScheduleLike {
  id: string;
  effectiveFrom: Date | null;
  shifts: ShiftLike[];
}

export interface LogLike {
  checkInAt: Date | null;
  checkOutAt: Date | null;
}

export interface DayMetrics {
  status: DayStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
  otMinutes: number;
}

// ── Date/time helpers ────────────────────────────────────────────────────────

export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Wall-clock minutes-since-midnight in the org's timezone. */
export function localMinutes(d: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

/** ISO weekday: 1=Mon … 7=Sun. JS getUTCDay returns 0=Sun…6=Sat. */
export function isoWeekday(d: Date): number {
  const js = d.getUTCDay();
  return js === 0 ? 7 : js;
}

export function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Schedule resolution ──────────────────────────────────────────────────────

/**
 * Find the active schedule for a given date.
 * `schedules` must be sorted by effectiveFrom DESC NULLS LAST (most recent first).
 * The first entry whose effectiveFrom ≤ date (or is null) wins.
 */
export function resolveSchedule<T extends { id: string; effectiveFrom: Date | null }>(
  schedules: T[],
  date: Date,
): T | null {
  return (
    schedules.find(
      (s) => s.effectiveFrom === null || s.effectiveFrom <= date,
    ) ?? null
  );
}

export function indexShiftsByDay(shifts: ShiftLike[]): Map<number, ShiftLike> {
  const map = new Map<number, ShiftLike>();
  for (const s of shifts) {
    for (const day of s.daysOfWeek) map.set(day, s);
  }
  return map;
}

// ── Compliance calculation ───────────────────────────────────────────────────

/**
 * Compute all attendance metrics for a single employee-day.
 *
 * FIXED mode:
 *   LATE         — checkIn  > startTime + config.lateGraceMinutes
 *   EARLY_LEAVE  — checkOut < endTime
 *   OT           — checkOut > endTime
 *
 * FLEXIBLE mode:
 *   LATE         — checkIn  > startTime + config.windowMinutes
 *   EARLY_LEAVE  — (checkOut − checkIn − breakMinutes) < (endTime − startTime − breakMinutes)
 *   OT           — worked   > required minutes
 *
 * LATE takes precedence over EARLY_LEAVE for the `status` field, but both
 * `lateMinutes` and `earlyLeaveMinutes` are always computed independently so
 * the report can surface both.
 */
export function computeDayMetrics(
  shift: ShiftLike | null,
  log: LogLike | null,
  tz: string,
): DayMetrics {
  const zero: DayMetrics = {
    status: 'WEEKEND',
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    workedMinutes: 0,
    otMinutes: 0,
  };

  if (!shift) return zero;
  if (!log || !log.checkInAt) return { ...zero, status: 'ABSENT' };

  const startM = hhmmToMinutes(shift.startTime);
  const endM = hhmmToMinutes(shift.endTime);
  const inM = localMinutes(log.checkInAt, tz);
  const outM = log.checkOutAt ? localMinutes(log.checkOutAt, tz) : null;

  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  let workedMinutes = 0;
  let otMinutes = 0;

  if (shift.mode === 'FLEXIBLE') {
    const windowM = (shift.config.windowMinutes as number | undefined) ?? 60;
    const requiredM = endM - startM - shift.breakMinutes;

    lateMinutes = Math.max(0, inM - (startM + windowM));

    if (outM !== null) {
      const netWorked = outM - inM - shift.breakMinutes;
      workedMinutes = Math.max(0, netWorked);
      earlyLeaveMinutes = Math.max(0, requiredM - netWorked);
      otMinutes = Math.max(0, netWorked - requiredM);
    }
  } else {
    // FIXED (default)
    const grace = (shift.config.lateGraceMinutes as number | undefined) ?? 15;

    lateMinutes = Math.max(0, inM - (startM + grace));

    if (outM !== null) {
      workedMinutes = Math.max(0, outM - inM);
      earlyLeaveMinutes = Math.max(0, endM - outM);
      otMinutes = Math.max(0, outM - endM);
    }
  }

  // Status: LATE takes precedence over EARLY_LEAVE
  let status: DayStatus = 'PRESENT';
  if (lateMinutes > 0) status = 'LATE';
  else if (earlyLeaveMinutes > 0) status = 'EARLY_LEAVE';

  return { status, lateMinutes, earlyLeaveMinutes, workedMinutes, otMinutes };
}
