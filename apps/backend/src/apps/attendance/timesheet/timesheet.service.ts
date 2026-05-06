import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { isAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { AttendanceLogRepository } from '../attendance-log/attendance-log.repository';
import { WorkScheduleRepository } from '../work-schedule/work-schedule.repository';

import { TimesheetQueryDto } from './dto';

export type DayStatus =
  | 'PRESENT'
  | 'LATE'
  | 'EARLY_LEAVE'
  | 'ABSENT'
  | 'WEEKEND';

export interface TimesheetDay {
  date: string; // YYYY-MM-DD
  shift: { name: string; startTime: string; endTime: string } | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: DayStatus;
}

export interface TimesheetResponse {
  year: number;
  month: number;
  workSchedule: {
    id: string;
    name: string;
    shifts: Array<{
      name: string;
      startTime: string;
      endTime: string;
      daysOfWeek: number[];
      lateGraceMinutes: number;
    }>;
  } | null;
  days: TimesheetDay[];
}

@Injectable()
export class TimesheetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly schedules: WorkScheduleRepository,
    private readonly logs: AttendanceLogRepository,
  ) {}

  async get(query: TimesheetQueryDto): Promise<TimesheetResponse> {
    const orgId = this.ctx.requireOrg();
    await this.requireSelfOrHrmAppAdmin(orgId, query.employeeId);

    const [employee, organization] = await Promise.all([
      this.prisma.employee.findFirst({
        where: { id: query.employeeId, organizationId: orgId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { timezone: true },
      }),
    ]);
    if (!employee) throw new NotFoundException('Employee not found in organization');
    const tz = organization?.timezone ?? 'Asia/Ho_Chi_Minh';

    const schedule = await this.schedules.findDefaultByOrg(orgId);
    const { from, to, dates } = monthRange(query.year, query.month);
    const logs = await this.logs.findByRange(orgId, query.employeeId, from, to);

    // Index logs by YYYY-MM-DD for O(1) day lookup.
    const logByDate = new Map<string, (typeof logs)[number]>();
    for (const l of logs) logByDate.set(toDateKey(l.date), l);

    const shiftsByDay = indexShiftsByDay(schedule?.shifts ?? []);

    const days: TimesheetDay[] = dates.map((date) => {
      const isoDay = isoWeekday(date);
      const shift = shiftsByDay.get(isoDay) ?? null;
      const log = logByDate.get(toDateKey(date)) ?? null;
      return {
        date: toDateKey(date),
        shift: shift
          ? { name: shift.name, startTime: shift.startTime, endTime: shift.endTime }
          : null,
        checkInAt: log?.checkInAt?.toISOString() ?? null,
        checkOutAt: log?.checkOutAt?.toISOString() ?? null,
        status: deriveStatus(shift, log, tz),
      };
    });

    return {
      year: query.year,
      month: query.month,
      workSchedule: schedule
        ? {
            id: schedule.id,
            name: schedule.name,
            shifts: schedule.shifts.map((s) => ({
              name: s.name,
              startTime: s.startTime,
              endTime: s.endTime,
              daysOfWeek: s.daysOfWeek,
              lateGraceMinutes: s.lateGraceMinutes,
            })),
          }
        : null,
      days,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private async requireSelfOrHrmAppAdmin(orgId: string, employeeId: string) {
    if (this.ctx.employeeId === employeeId) return;
    const ok = await isAppAdmin(this.ctx, 'HRM', orgId, this.prisma);
    if (!ok) {
      throw new ForbiddenException('Can only view your own timesheet');
    }
  }
}

// ──────────────────────────────────────────────────────────────────
// Pure helpers (no DI)
// ──────────────────────────────────────────────────────────────────

interface ShiftLike {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  lateGraceMinutes: number;
  crossesMidnight: boolean;
}

function monthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = new Date(Date.UTC(year, month - 1, last));
  const dates: Date[] = [];
  for (let d = 1; d <= last; d++) {
    dates.push(new Date(Date.UTC(year, month - 1, d)));
  }
  return { from, to, dates };
}

function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ISO weekday: 1=Mon ... 7=Sun. JS getUTCDay returns 0=Sun..6=Sat. */
function isoWeekday(d: Date): number {
  const js = d.getUTCDay();
  return js === 0 ? 7 : js;
}

function indexShiftsByDay(shifts: ShiftLike[]): Map<number, ShiftLike> {
  const m = new Map<number, ShiftLike>();
  for (const s of shifts) {
    for (const day of s.daysOfWeek) m.set(day, s);
  }
  return m;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Wall-clock minutes-since-midnight in the org's timezone. Shift times
 * (e.g. "08:00") are stored as plain strings representing local time, so
 * we must compare against check-in's local hours/minutes — not UTC.
 * en-GB locale gives a stable 00–23 hour format.
 */
function localMinutes(d: Date, tz: string): number {
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

function deriveStatus(
  shift: ShiftLike | null,
  log: { checkInAt: Date | null; checkOutAt: Date | null } | null,
  tz: string,
): DayStatus {
  if (!shift) return 'WEEKEND';
  if (!log || !log.checkInAt) return 'ABSENT';

  const startM = hhmmToMinutes(shift.startTime);
  const endM = hhmmToMinutes(shift.endTime);
  const inM = localMinutes(log.checkInAt, tz);
  const outM = log.checkOutAt ? localMinutes(log.checkOutAt, tz) : null;

  if (inM > startM + shift.lateGraceMinutes) return 'LATE';
  if (outM !== null && outM < endM) return 'EARLY_LEAVE';
  return 'PRESENT';
}
