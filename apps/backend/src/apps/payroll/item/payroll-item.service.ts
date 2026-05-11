import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PayrollStatus, Prisma } from '@prisma/client';
import type { Response } from 'express';

import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { CalcInput, Region, computePayroll } from '../calculator';
import { PayrollConfigService } from '../config/payroll-config.service';
import { itemToPayslipPayload } from '../lib/payslip-mapper';
import { buildPayslipXlsx } from '../lib/payslip.xlsx-builder';
import {
  jsonToAllowances,
  jsonToDeductions,
  toConfigSnapshot,
} from '../period/payroll-period.service';

import { AllowanceRowDto, DeductionRowDto, ListItemsDto, UpdateItemDto } from './dto';
import { PayrollItemAcl, PayrollItemAclSubject } from './payroll-item.acl';
import { PayrollItemRepository } from './payroll-item.repository';

type ItemWithRelations = Awaited<ReturnType<PayrollItemRepository['findByIdByOrg']>>;

@Injectable()
export class PayrollItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: PayrollItemRepository,
    private readonly configService: PayrollConfigService,
  ) {}

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Payroll item not found');
    const acl = this.buildAcl(row);
    await acl.require('canView');
    return { ...row, view: await acl.getAcl() };
  }

  async listForPeriod(periodId: string, query: ListItemsDto) {
    const orgId = this.ctx.requireOrg();

    // Gate on the period — same canView rule as PayrollPeriodAcl (HRM admin).
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, organizationId: orgId },
      select: { id: true, organizationId: true, status: true },
    });
    if (!period) throw new NotFoundException('Period not found');
    this.ctx.requireAppAdmin('HRM', orgId);

    const employeeWhere: Prisma.EmployeeWhereInput = {};
    if (query.departmentId) employeeWhere.departmentId = query.departmentId;
    if (query.q) {
      employeeWhere.OR = [
        { code: { contains: query.q, mode: 'insensitive' } },
        { user: { name: { contains: query.q, mode: 'insensitive' } } },
        { user: { email: { contains: query.q, mode: 'insensitive' } } },
      ];
    }

    const where: Prisma.PayrollItemWhereInput = {};
    if (Object.keys(employeeWhere).length > 0) where.employee = employeeWhere;

    return this.repo.findManyByPeriodByOrg(orgId, periodId, where);
  }

  async update(id: string, dto: UpdateItemDto) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Payroll item not found');

    const acl = this.buildAcl(row);
    await acl.require('canEdit');

    if (row.period.status !== PayrollStatus.DRAFT) {
      throw new ForbiddenException('Không sửa được trên kỳ đã đóng');
    }

    const data: Prisma.PayrollItemUncheckedUpdateInput = {};
    if (dto.baseSalary !== undefined) data.baseSalary = new Prisma.Decimal(dto.baseSalary);
    if (dto.dependents !== undefined) data.dependents = dto.dependents;
    if (dto.region !== undefined) data.region = dto.region;
    if (dto.standardWorkdays !== undefined) data.standardWorkdays = dto.standardWorkdays;
    if (dto.actualWorkdays !== undefined)
      data.actualWorkdays = new Prisma.Decimal(dto.actualWorkdays);
    if (dto.lateMinutes !== undefined) data.lateMinutes = dto.lateMinutes;
    if (dto.earlyLeaveMinutes !== undefined) data.earlyLeaveMinutes = dto.earlyLeaveMinutes;
    if (dto.otMinutesWeekday !== undefined) data.otMinutesWeekday = dto.otMinutesWeekday;
    if (dto.otMinutesWeekend !== undefined) data.otMinutesWeekend = dto.otMinutesWeekend;
    if (dto.otMinutesHoliday !== undefined) data.otMinutesHoliday = dto.otMinutesHoliday;
    if (dto.allowancesJson !== undefined) {
      data.allowancesJson = dto.allowancesJson as unknown as Prisma.InputJsonValue;
    }
    if (dto.deductionsJson !== undefined) {
      data.deductionsJson = dto.deductionsJson as unknown as Prisma.InputJsonValue;
    }
    if (dto.computeNote !== undefined) data.computeNote = dto.computeNote;

    await this.repo.update(id, data);
    return this.computeOne(id);
  }

  /**
   * Re-run the calculator for this item without changing inputs. Use
   * case: HR updated PayrollConfig (e.g. tax brackets) and wants this
   * specific item refreshed. For an entire period, prefer
   * `PayrollPeriodService.recomputeAll`.
   */
  async recompute(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Payroll item not found');

    const acl = this.buildAcl(row);
    await acl.require('canEdit');

    if (row.period.status !== PayrollStatus.DRAFT) {
      throw new ForbiddenException('Không sửa được trên kỳ đã đóng');
    }

    return this.computeOne(id);
  }

  /**
   * Stream the payslip xlsx for one item. ACL via `findOne` gates HRM admin
   * or self-view; bypasses the global JSON envelope by writing directly to
   * the Express response.
   */
  async exportPayslipXlsx(id: string, res: Response): Promise<void> {
    const item = await this.findOne(id);

    const [employeeExtra, org, user] = await Promise.all([
      this.prisma.employee.findUnique({
        where: { id: item.employeeId },
        select: { title: true, taxCode: true, bhxhCode: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: item.organizationId },
        select: { name: true },
      }),
      this.ctx.userId
        ? this.prisma.user.findUnique({
            where: { id: this.ctx.userId },
            select: { name: true, email: true },
          })
        : Promise.resolve(null),
    ]);

    const payload = itemToPayslipPayload({
      item,
      employeeExtra: employeeExtra ?? { title: null, taxCode: null, bhxhCode: null },
      org: { name: org?.name ?? null },
      generatedBy: user?.name ?? user?.email ?? null,
    });

    const buffer = buildPayslipXlsx(payload);
    const filename = `payslip_${item.employee.code}_${item.period.monthKey}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);
  }

  // ──────────────────────────────────────────────────────────────────
  // Private — single-item compute
  // ──────────────────────────────────────────────────────────────────

  private async computeOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Payroll item not found');

    const config = await this.configService.get(row.period.year);
    const snapshot = toConfigSnapshot(config);

    const input: CalcInput = {
      baseSalary: row.baseSalary.toNumber(),
      region: row.region as Region,
      dependents: row.dependents,
      standardWorkdays: row.standardWorkdays,
      actualWorkdays: row.actualWorkdays.toNumber(),
      otMinutesWeekday: row.otMinutesWeekday,
      otMinutesWeekend: row.otMinutesWeekend,
      otMinutesHoliday: row.otMinutesHoliday,
      allowances: jsonToAllowances(row.allowancesJson),
      deductions: jsonToDeductions(row.deductionsJson),
      config: snapshot,
    };
    const out = computePayroll(input);

    const updated = await this.repo.update(id, {
      grossIncome: out.grossIncome,
      insurableBase: out.insurableBase,
      bhxhEmployee: out.bhxhEmployee,
      bhytEmployee: out.bhytEmployee,
      bhtnEmployee: out.bhtnEmployee,
      insuranceTotal: out.insuranceTotal,
      taxableIncome: out.taxableIncome,
      taxAmount: out.taxAmount,
      netPay: out.netPay,
    });

    const acl = this.buildAcl(updated);
    return { ...updated, view: await acl.getAcl() };
  }

  private buildAcl(row: NonNullable<ItemWithRelations>): PayrollItemAcl {
    const subject: PayrollItemAclSubject = {
      id: row.id,
      organizationId: row.organizationId,
      periodId: row.periodId,
      employeeId: row.employeeId,
      _periodStatus: row.period.status,
      _employeeUserId: row.employee.user?.id ?? null,
    };
    return new PayrollItemAcl(subject);
  }
}

// Re-export DTO shapes so the controller layer can stay thin.
export type { AllowanceRowDto, DeductionRowDto };
