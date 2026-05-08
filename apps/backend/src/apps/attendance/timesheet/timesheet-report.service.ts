import { BadRequestException, Injectable } from '@nestjs/common';

import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { WorkScheduleRepository } from '../work-schedule/work-schedule.repository';

import { TimesheetSummaryQueryDto } from './dto';

const MAX_RANGE_DAYS = 92; // ~3 months — caps the aggregation cost.

interface ShiftLike {
  name: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  daysOfWeek: number[];
  lateGraceMinutes: number;
  crossesMidnight: boolean;
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
  employeeId: string;
  code: string;
  name: string | null;
  value: number;
  /** Optional secondary metric — e.g. lateMinutes alongside lateCount. */
  detail?: number;
}

export interface OverviewResponse {
  totals: OverviewTotals;
  trend: OverviewTrendPoint[];
  topLate: OverviewTopRow[];
  topAbsent: OverviewTopRow[];
}

export interface EmployeeSummaryRow {
  employeeId: string;
  code: string;
  name: string;
  email: string | null;
  departmentId: string | null;
  departmentName: string | null;

  /** Days in period where the employee was scheduled to work. */
  standardWorkdays: number;
  /** Days the employee actually checked in (PRESENT + LATE). */
  actualWorkdays: number;

  /** Total minutes between check-in and check-out, summed across the period. */
  totalWorkMinutes: number;

  /** # of days late + total minutes late. */
  lateCount: number;
  lateMinutes: number;

  /** # of days left early + total minutes early. */
  earlyLeaveCount: number;
  earlyLeaveMinutes: number;

  /**
   * Days scheduled to work but no check-in. v1 does NOT overlay leave
   * requests — Phase 7 will split this into ABSENT vs ON_LEAVE.
   */
  absentDays: number;

  /** Minutes worked beyond the shift end (clamped to ≥ 0). v1: single bucket. */
  otMinutes: number;

  /** actualWorkdays / standardWorkdays — 0 when no scheduled days. */
  attendanceRate: number;
}

@Injectable()
export class TimesheetReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly schedules: WorkScheduleRepository,
  ) {}

  async summary(query: TimesheetSummaryQueryDto): Promise<EmployeeSummaryRow[]> {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const from = new Date(`${query.from}T00:00:00.000Z`);
    const to = new Date(`${query.to}T23:59:59.999Z`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (to <= from) {
      throw new BadRequestException('"to" must be on/after "from"');
    }
    const span = (to.getTime() - from.getTime()) / 86_400_000;
    if (span > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Range too wide (max ${MAX_RANGE_DAYS} days)`);
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { timezone: true },
    });
    const tz = org?.timezone ?? 'Asia/Ho_Chi_Minh';

    const schedule = await this.schedules.findDefaultByOrg(orgId);
    const shiftsByDay = indexShiftsByDay(schedule?.shifts ?? []);

    // 1. Fetch employees matching filters.
    const employees = await this.prisma.employee.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: 'ACTIVE',
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
        ...(query.q
          ? {
              OR: [
                { code: { contains: query.q, mode: 'insensitive' } },
                { user: { name: { contains: query.q, mode: 'insensitive' } } },
                { user: { email: { contains: query.q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ code: 'asc' }],
    });

    if (employees.length === 0) return [];

    const employeeIds = employees.map((e) => e.id);

    // 2. Bulk-fetch attendance logs for all matching employees + the
    //    period in one query, then group in-memory by employeeId+date.
    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        organizationId: orgId,
        employeeId: { in: employeeIds },
        date: { gte: from, lte: to },
      },
      select: {
        employeeId: true,
        date: true,
        checkInAt: true,
        checkOutAt: true,
      },
    });

    const logsByEmpDate = new Map<string, { checkInAt: Date | null; checkOutAt: Date | null }>();
    for (const l of logs) {
      if (!l.employeeId) continue;
      logsByEmpDate.set(`${l.employeeId}|${toDateKey(l.date)}`, {
        checkInAt: l.checkInAt,
        checkOutAt: l.checkOutAt,
      });
    }

    // 3. Iterate every (employee × day) and aggregate.
    const dates = enumerateDays(from, to);
    const rows: EmployeeSummaryRow[] = [];

    for (const emp of employees) {
      let standardWorkdays = 0;
      let actualWorkdays = 0;
      let totalWorkMinutes = 0;
      let lateCount = 0;
      let lateMinutes = 0;
      let earlyLeaveCount = 0;
      let earlyLeaveMinutes = 0;
      let absentDays = 0;
      let otMinutes = 0;

      for (const d of dates) {
        const isoDay = isoWeekday(d);
        const shift = shiftsByDay.get(isoDay) ?? null;
        if (!shift) continue; // weekend / non-scheduled day
        standardWorkdays++;

        const log = logsByEmpDate.get(`${emp.id}|${toDateKey(d)}`) ?? null;
        if (!log || !log.checkInAt) {
          absentDays++;
          continue;
        }

        actualWorkdays++;
        const startM = hhmmToMinutes(shift.startTime);
        const endM = hhmmToMinutes(shift.endTime);
        const inM = localMinutes(log.checkInAt, tz);
        const outM = log.checkOutAt ? localMinutes(log.checkOutAt, tz) : null;

        const lateBy = inM - (startM + shift.lateGraceMinutes);
        if (lateBy > 0) {
          lateCount++;
          lateMinutes += lateBy;
        }

        if (outM !== null) {
          if (outM < endM) {
            earlyLeaveCount++;
            earlyLeaveMinutes += endM - outM;
          }
          // Worked minutes — clamp to non-negative; cross-midnight not yet modeled.
          const worked = Math.max(0, outM - inM);
          totalWorkMinutes += worked;
          if (outM > endM) {
            otMinutes += outM - endM;
          }
        }
      }

      const attendanceRate =
        standardWorkdays > 0 ? actualWorkdays / standardWorkdays : 0;

      rows.push({
        employeeId: emp.id,
        code: emp.code,
        name: emp.user?.name ?? null,
        email: emp.user?.email ?? null,
        departmentId: emp.departmentId,
        departmentName: emp.department?.name ?? null,
        standardWorkdays,
        actualWorkdays,
        totalWorkMinutes,
        lateCount,
        lateMinutes,
        earlyLeaveCount,
        earlyLeaveMinutes,
        absentDays,
        otMinutes,
        attendanceRate,
      } as EmployeeSummaryRow);
    }

    return rows;
  }

  /**
   * Org-wide aggregate for the "Tổng quan" tab. Reuses `summary()` for
   * the requested period so totals + topLate / topAbsent stay
   * consistent with the per-employee tab. The 6-month trend runs
   * `summary()` once per past month (cheap aggregation) — small org
   * (<500 employees) under 1.5s; big org needs caching (Phase 7).
   */
  async overview(query: TimesheetSummaryQueryDto): Promise<OverviewResponse> {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    // Period totals + top lists, derived from the same summary path.
    const periodRows = await this.summary(query);
    const totals: OverviewTotals = {
      activeEmployees: periodRows.length,
      totalWorkMinutes: periodRows.reduce((s, r) => s + r.totalWorkMinutes, 0),
      totalOTMinutes: periodRows.reduce((s, r) => s + r.otMinutes, 0),
      attendanceRate: avgAttendanceRate(periodRows),
    };

    const topLate: OverviewTopRow[] = [...periodRows]
      .filter((r) => r.lateCount > 0)
      .sort((a, b) => b.lateMinutes - a.lateMinutes)
      .slice(0, 5)
      .map((r) => ({
        employeeId: r.employeeId,
        code: r.code,
        name: r.name,
        value: r.lateCount,
        detail: r.lateMinutes,
      }));

    const topAbsent: OverviewTopRow[] = [...periodRows]
      .filter((r) => r.absentDays > 0)
      .sort((a, b) => b.absentDays - a.absentDays)
      .slice(0, 5)
      .map((r) => ({
        employeeId: r.employeeId,
        code: r.code,
        name: r.name,
        value: r.absentDays,
      }));

    // 6-month trend ending at the queried period's "to". We anchor on
    // the last day of the queried period so user can see "trend up to
    // April 2026" when they're looking at April. Each point reuses
    // summary() — fine for SMB, swap for materialized view at scale.
    const anchor = new Date(`${query.to}T00:00:00Z`);
    const trend: OverviewTrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
      const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i + 1, 0));
      const monthRows = await this.summary({
        from: toDateKey(start),
        to: toDateKey(end),
        ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      });
      trend.push({
        month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
        totalWorkMinutes: monthRows.reduce((s, r) => s + r.totalWorkMinutes, 0),
        totalOTMinutes: monthRows.reduce((s, r) => s + r.otMinutes, 0),
      });
    }

    return { totals, trend, topLate, topAbsent };
  }
}

function avgAttendanceRate(rows: EmployeeSummaryRow[]): number {
  if (rows.length === 0) return 0;
  // Weight by standard workdays so a half-period new hire doesn't skew the
  // org rate.
  let totalActual = 0;
  let totalStandard = 0;
  for (const r of rows) {
    totalActual += r.actualWorkdays;
    totalStandard += r.standardWorkdays;
  }
  return totalStandard > 0 ? totalActual / totalStandard : 0;
}

// ──────────────────────────────────────────────────────────────────
// Pure helpers — same shape as timesheet.service.ts but kept private here
// to avoid churning the public surface of the existing service.
// ──────────────────────────────────────────────────────────────────

function enumerateDays(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(new Date(d));
  }
  return out;
}

function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
