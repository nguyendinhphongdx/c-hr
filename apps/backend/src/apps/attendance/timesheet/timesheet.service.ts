import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { RequestContextService } from '@/common/context';
import { EmployeeAcl } from '@/apps/hrm/employee/employee.acl';
import { PrismaService } from '@libs/database/prisma.service';

import { AttendanceLogRepository } from '../attendance-log/attendance-log.repository';
import { WorkScheduleRepository } from '../work-schedule/work-schedule.repository';

import { TimesheetQueryDto } from './dto';
import {
  computeDayMetrics,
  indexShiftsByDay,
  isoWeekday,
  resolveSchedule,
  toDateKey,
  type DayStatus,
  type ShiftLike,
} from './timesheet-utils';

export type { DayStatus };

export interface TimesheetDay {
  date: string; // YYYY-MM-DD
  shift: { name: string; startTime: string; endTime: string; mode: string } | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: DayStatus;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workedMinutes: number;
}

export interface TimesheetResponse {
  year: number;
  month: number;
  schedules: Array<{
    id: string;
    name: string;
    effectiveFrom: string | null;
    shifts: Array<{
      name: string;
      startTime: string;
      endTime: string;
      daysOfWeek: number[];
      mode: string;
      config: Record<string, unknown>;
    }>;
  }>;
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
    const acl = new EmployeeAcl({ id: query.employeeId, organizationId: orgId });
    if (!acl.canViewLogs()) {
      throw new ForbiddenException('Can only view your own timesheet');
    }

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

    // Load all schedules once (typically 1–5 records) — sorted newest first.
    const allSchedules = await this.schedules.findManyByOrg(orgId);

    // Pre-index shifts per schedule to avoid rebuilding the map for each day.
    const shiftMapBySchedule = new Map<string, Map<number, ShiftLike>>();
    for (const s of allSchedules) {
      shiftMapBySchedule.set(s.id, indexShiftsByDay(s.shifts as ShiftLike[]));
    }

    const { from, to, dates } = monthRange(query.year, query.month);
    const logs = await this.logs.findByRange(orgId, query.employeeId, from, to);

    const logByDate = new Map<string, (typeof logs)[number]>();
    for (const l of logs) logByDate.set(toDateKey(l.date), l);

    const days: TimesheetDay[] = dates.map((date) => {
      const schedule = resolveSchedule(allSchedules, date);
      const shiftMap = schedule ? (shiftMapBySchedule.get(schedule.id) ?? new Map()) : new Map();
      const shift = shiftMap.get(isoWeekday(date)) ?? null;
      const log = logByDate.get(toDateKey(date)) ?? null;
      const metrics = computeDayMetrics(shift, log, tz);

      return {
        date: toDateKey(date),
        shift: shift
          ? { name: shift.name, startTime: shift.startTime, endTime: shift.endTime, mode: shift.mode }
          : null,
        checkInAt: log?.checkInAt?.toISOString() ?? null,
        checkOutAt: log?.checkOutAt?.toISOString() ?? null,
        status: metrics.status,
        lateMinutes: metrics.lateMinutes,
        earlyLeaveMinutes: metrics.earlyLeaveMinutes,
        workedMinutes: metrics.workedMinutes,
      };
    });

    return {
      year: query.year,
      month: query.month,
      schedules: allSchedules.map((s) => ({
        id: s.id,
        name: s.name,
        effectiveFrom: s.effectiveFrom?.toISOString() ?? null,
        shifts: s.shifts.map((sh) => ({
          name: sh.name,
          startTime: sh.startTime,
          endTime: sh.endTime,
          daysOfWeek: sh.daysOfWeek,
          mode: sh.mode,
          config: sh.config as Record<string, unknown>,
        })),
      })),
      days,
    };
  }
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

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
