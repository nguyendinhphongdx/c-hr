import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PayrollConfig, PayrollStatus, Prisma, RegionTier } from '@prisma/client';

import { TimesheetReportService } from '@/apps/attendance/timesheet/timesheet-report.service';
import { ActivityService } from '@/apps/collaboration/activity/activity.service';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import {
  AllowanceRow,
  CalcInput,
  ConfigSnapshot,
  DeductionRow,
  OtRates,
  Region,
  TaxBracket,
  computePayroll,
} from '../calculator';
import { PayrollConfigService } from '../config/payroll-config.service';

import { CreatePeriodDto, ListPeriodsDto, UpdatePeriodDto } from './dto';
import { PayrollPeriodAcl, PayrollPeriodAclSubject } from './payroll-period.acl';
import { PayrollPeriodRepository } from './payroll-period.repository';

/** Subset of a period header used to instantiate the ACL. */
type PeriodForAcl = Pick<PayrollPeriodAclSubject, 'id' | 'organizationId' | 'status'>;

@Injectable()
export class PayrollPeriodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: PayrollPeriodRepository,
    private readonly configService: PayrollConfigService,
    private readonly timesheetReport: TimesheetReportService,
    private readonly activities: ActivityService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Reads
  // ──────────────────────────────────────────────────────────────────

  async list(query: ListPeriodsDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const where: Prisma.PayrollPeriodWhereInput = {};
    if (query.year !== undefined) where.year = query.year;
    if (query.status !== undefined) where.status = query.status;

    const rows = await this.repo.findManyByOrg(orgId, where);

    // Decorate with sum(netPay) header KPI per row. Cheap N+1 — small
    // result set (max ~12 periods/year) and a single aggregate per row.
    const decorated = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        totalNetPay: await this.repo.sumNetPay(row.id),
      })),
    );
    return decorated;
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Period not found');

    const acl = this.buildAcl(row);
    await acl.require('canView');

    return {
      ...row,
      totalNetPay: await this.repo.sumNetPay(id),
      view: await acl.getAcl(),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────────────────────────────────

  async create(dto: CreatePeriodDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);
    const callerId = this.ctx.requireUserId();

    if (dto.month < 1 || dto.month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }
    const monthKey = `${dto.year}-${String(dto.month).padStart(2, '0')}`;

    const dup = await this.repo.findByMonthKeyByOrg(orgId, monthKey);
    if (dup) throw new ConflictException('Kỳ lương tháng này đã tồn tại');

    // Resolve config OUTSIDE the create transaction. `configService.get`
    // auto-creates VN-2024 defaults on first access — should not run
    // inside the period tx (separate row, separate concern).
    const config = await this.configService.get(dto.year);

    const periodId = await this.prisma.$transaction(async (tx) => {
      const period = await tx.payrollPeriod.create({
        data: {
          organizationId: orgId,
          monthKey,
          year: dto.year,
          month: dto.month,
          status: PayrollStatus.DRAFT,
          note: dto.note ?? null,
          createdById: callerId,
        },
        select: { id: true },
      });
      return period.id;
    });

    // Seed + compute outside the create tx so a slow timesheet aggregation
    // doesn't hold a write lock on payroll_periods. Both run in their own
    // transactions for batched inserts.
    const seedResult = await this.seedItems(periodId, orgId, dto.year, dto.month);
    await this.computeAll(periodId, orgId, config);

    this.activities.log({
      organizationId: orgId,
      objectType: 'PayrollPeriod',
      objectId: periodId,
      objectLabel: monthKey,
      action: 'payroll.period_created',
      userId: callerId,
    });

    const fresh = await this.repo.findByIdByOrg(orgId, periodId);
    return {
      ...fresh!,
      totalNetPay: await this.repo.sumNetPay(periodId),
      meta: { skippedEmployees: seedResult.skippedEmployees },
    };
  }

  async update(id: string, dto: UpdatePeriodDto) {
    const orgId = this.ctx.requireOrg();
    const row = await this.requireRow(orgId, id);

    const acl = this.buildAcl(row);
    await acl.require('canEdit');

    const data: Prisma.PayrollPeriodUncheckedUpdateInput = {};
    if (dto.note !== undefined) data.note = dto.note;

    const updated = await this.repo.update(id, data);
    return {
      ...updated,
      totalNetPay: await this.repo.sumNetPay(id),
    };
  }

  async close(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.requireRow(orgId, id);
    const acl = this.buildAcl(row);
    if (!acl.canClose()) {
      throw new ForbiddenException('Not allowed: canClose');
    }

    const userId = this.ctx.requireUserId();
    const updated = await this.repo.update(id, {
      status: PayrollStatus.CLOSED,
      closedAt: new Date(),
      closedById: userId,
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'PayrollPeriod',
      objectId: id,
      objectLabel: row.monthKey,
      action: 'payroll.period_closed',
      userId,
    });

    return {
      ...updated,
      totalNetPay: await this.repo.sumNetPay(id),
    };
  }

  async pay(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.requireRow(orgId, id);
    if (row.status !== PayrollStatus.CLOSED) {
      throw new BadRequestException('Phải đóng kỳ lương trước khi trả');
    }
    const acl = this.buildAcl(row);
    if (!acl.canPay()) {
      throw new ForbiddenException('Not allowed: canPay');
    }

    const userId = this.ctx.requireUserId();
    const updated = await this.repo.update(id, {
      status: PayrollStatus.PAID,
      paidAt: new Date(),
      paidById: userId,
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'PayrollPeriod',
      objectId: id,
      objectLabel: row.monthKey,
      action: 'payroll.period_paid',
      userId,
    });

    return {
      ...updated,
      totalNetPay: await this.repo.sumNetPay(id),
    };
  }

  async reopen(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.requireRow(orgId, id);
    const acl = this.buildAcl(row);
    if (!acl.canReopen()) {
      throw new ForbiddenException('Not allowed: canReopen');
    }

    const userId = this.ctx.requireUserId();
    const updated = await this.repo.update(id, {
      status: PayrollStatus.DRAFT,
      closedAt: null,
      closedById: null,
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'PayrollPeriod',
      objectId: id,
      objectLabel: row.monthKey,
      action: 'payroll.period_reopened',
      userId,
    });

    return {
      ...updated,
      totalNetPay: await this.repo.sumNetPay(id),
    };
  }

  async remove(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.requireRow(orgId, id);
    const acl = this.buildAcl(row);
    await acl.require('canDelete');

    await this.repo.remove(id);

    this.activities.log({
      organizationId: orgId,
      objectType: 'PayrollPeriod',
      objectId: id,
      objectLabel: row.monthKey,
      action: 'payroll.period_deleted',
      userId: this.ctx.userId,
    });

    return { id, success: true as const };
  }

  async recomputeAll(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.requireRow(orgId, id);
    if (row.status !== PayrollStatus.DRAFT) {
      throw new ForbiddenException('Kỳ lương đã đóng/trả, không thể tính lại');
    }
    const acl = this.buildAcl(row);
    await acl.require('canEdit');

    const config = await this.configService.get(row.year);
    await this.computeAll(id, orgId, config);

    const fresh = await this.repo.findByIdByOrg(orgId, id);
    return {
      ...fresh!,
      totalNetPay: await this.repo.sumNetPay(id),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Private — seed + compute
  // ──────────────────────────────────────────────────────────────────

  /**
   * Pull active employees + timesheet summary for the period and create
   * one PayrollItem per eligible employee. Employees with null baseSalary
   * are skipped (not on payroll) — their codes are returned so HR can
   * fix in the UI. Uses `createMany` with `skipDuplicates` so a re-run
   * of seed (e.g. retry after a partial failure) is a no-op for already
   * seeded employees.
   *
   * Note: the period itself is already persisted before this runs — the
   * caller controls the parent transaction. Timesheet summary aggregation
   * is non-trivial (per-employee × per-day loop), so we keep it out of
   * the period write tx.
   */
  private async seedItems(
    periodId: string,
    orgId: string,
    year: number,
    month: number,
  ): Promise<{ skippedEmployees: string[] }> {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = lastDayOfMonth(year, month);

    const [employees, timesheetRows] = await Promise.all([
      this.prisma.employee.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          code: true,
          baseSalary: true,
          dependents: true,
          region: true,
        },
      }),
      this.timesheetReport.summary({ from, to }),
    ]);

    const timesheetByEmpId = new Map(timesheetRows.map((r) => [r.employeeId, r] as const));

    const skippedEmployees: string[] = [];
    const itemsToCreate: Prisma.PayrollItemCreateManyInput[] = [];

    for (const emp of employees) {
      if (emp.baseSalary == null) {
        skippedEmployees.push(emp.code);
        continue;
      }
      const ts = timesheetByEmpId.get(emp.id);
      const standardWorkdays = ts?.standardWorkdays ?? 0;
      const actualWorkdays = ts?.actualWorkdays ?? 0;
      const lateMinutes = ts?.lateMinutes ?? 0;
      const earlyLeaveMinutes = ts?.earlyLeaveMinutes ?? 0;
      // Timesheet v1 doesn't split OT into weekday/weekend/holiday buckets
      // — drop the lump sum into the weekday bucket; HR splits later
      // via the item edit dialog.
      const otMinutesWeekday = ts?.otMinutes ?? 0;

      itemsToCreate.push({
        organizationId: orgId,
        periodId,
        employeeId: emp.id,
        baseSalary: emp.baseSalary,
        dependents: emp.dependents,
        region: emp.region,
        standardWorkdays,
        actualWorkdays: new Prisma.Decimal(actualWorkdays),
        lateMinutes,
        earlyLeaveMinutes,
        otMinutesWeekday,
        otMinutesWeekend: 0,
        otMinutesHoliday: 0,
        allowancesJson: [] as unknown as Prisma.InputJsonValue,
        deductionsJson: [] as unknown as Prisma.InputJsonValue,
      });
    }

    if (itemsToCreate.length > 0) {
      await this.prisma.payrollItem.createMany({
        data: itemsToCreate,
        skipDuplicates: true,
      });
    }

    return { skippedEmployees };
  }

  /**
   * Run the calculator across every item in the period. Loads config +
   * items once, computes in-memory, then writes back inside a single
   * transaction. Pure-function calculator means no IO inside the loop.
   *
   * Guard: callers must verify the period is in DRAFT before invoking
   * this; we double-check here to defend against direct calls.
   */
  private async computeAll(periodId: string, orgId: string, config: PayrollConfig): Promise<void> {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, organizationId: orgId },
      select: { status: true },
    });
    if (!period) throw new NotFoundException('Period not found');
    if (period.status !== PayrollStatus.DRAFT) {
      throw new ForbiddenException('Kỳ lương đã đóng/trả, không thể tính lại');
    }

    const items = await this.prisma.payrollItem.findMany({
      where: { periodId, organizationId: orgId },
      select: {
        id: true,
        baseSalary: true,
        dependents: true,
        region: true,
        standardWorkdays: true,
        actualWorkdays: true,
        otMinutesWeekday: true,
        otMinutesWeekend: true,
        otMinutesHoliday: true,
        allowancesJson: true,
        deductionsJson: true,
      },
    });
    if (items.length === 0) return;

    const snapshot = toConfigSnapshot(config);

    await this.prisma.$transaction(
      items.map((item) => {
        const input: CalcInput = {
          baseSalary: item.baseSalary.toNumber(),
          region: item.region as Region,
          dependents: item.dependents,
          standardWorkdays: item.standardWorkdays,
          actualWorkdays: item.actualWorkdays.toNumber(),
          otMinutesWeekday: item.otMinutesWeekday,
          otMinutesWeekend: item.otMinutesWeekend,
          otMinutesHoliday: item.otMinutesHoliday,
          allowances: jsonToAllowances(item.allowancesJson),
          deductions: jsonToDeductions(item.deductionsJson),
          config: snapshot,
        };
        const out = computePayroll(input);
        return this.prisma.payrollItem.update({
          where: { id: item.id },
          data: {
            grossIncome: out.grossIncome,
            insurableBase: out.insurableBase,
            bhxhEmployee: out.bhxhEmployee,
            bhytEmployee: out.bhytEmployee,
            bhtnEmployee: out.bhtnEmployee,
            insuranceTotal: out.insuranceTotal,
            taxableIncome: out.taxableIncome,
            taxAmount: out.taxAmount,
            netPay: out.netPay,
          },
        });
      }),
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private async requireRow(orgId: string, id: string) {
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Period not found');
    return row;
  }

  private buildAcl(row: PeriodForAcl): PayrollPeriodAcl {
    return new PayrollPeriodAcl({
      id: row.id,
      organizationId: row.organizationId,
      status: row.status,
    });
  }
}

// ──────────────────────────────────────────────────────────────────
// Pure helpers — shared with PayrollItemService via export.
// ──────────────────────────────────────────────────────────────────

/** Convert Prisma `PayrollConfig` row (Decimal columns) to the plain-number
 *  `ConfigSnapshot` consumed by the pure calculator. */
export function toConfigSnapshot(config: PayrollConfig): ConfigSnapshot {
  return {
    personalDeduction: config.personalDeduction.toNumber(),
    dependentDeduction: config.dependentDeduction.toNumber(),
    regionMinWage: config.regionMinWageJson as unknown as Record<Region, number>,
    insuranceCapMultiplier: config.insuranceCapMultiplier.toNumber(),
    bhxhRate: config.bhxhRate.toNumber(),
    bhytRate: config.bhytRate.toNumber(),
    bhtnRate: config.bhtnRate.toNumber(),
    otRates: config.otRatesJson as unknown as OtRates,
    taxBrackets: config.taxBracketsJson as unknown as TaxBracket[],
  };
}

function asObjects(json: Prisma.JsonValue): Record<string, unknown>[] {
  if (!Array.isArray(json)) return [];
  const out: Record<string, unknown>[] = [];
  for (const entry of json) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      out.push(entry as Record<string, unknown>);
    }
  }
  return out;
}

export function jsonToAllowances(json: Prisma.JsonValue): AllowanceRow[] {
  return asObjects(json).map((r) => ({
    name: String(r.name ?? ''),
    amount: Number(r.amount ?? 0),
    taxable: Boolean(r.taxable ?? false),
    insurable: Boolean(r.insurable ?? false),
  }));
}

export function jsonToDeductions(json: Prisma.JsonValue): DeductionRow[] {
  return asObjects(json).map((r) => ({
    name: String(r.name ?? ''),
    amount: Number(r.amount ?? 0),
    note: typeof r.note === 'string' ? r.note : undefined,
  }));
}

/** `YYYY-MM-DD` of the last day of (year, month). 1-indexed month. */
function lastDayOfMonth(year: number, month: number): string {
  // JS Date with day=0 of next month yields the last day of current month.
  // Use UTC to dodge tz offset issues; consumer (timesheet summary) parses
  // both bounds as UTC midnight.
  const d = new Date(Date.UTC(year, month, 0));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Re-export the RegionTier enum type so item service can use the same
// alias without importing twice.
export type { RegionTier };
