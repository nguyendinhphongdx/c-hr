import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

/**
 * Shape returned by detail endpoints — period header + items joined with
 * a thin employee summary so FE can render rows without a second fetch.
 */
export const PERIOD_ITEM_INCLUDE = {
  employee: {
    select: {
      id: true,
      code: true,
      department: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  },
} as const;

export const PERIOD_FULL_INCLUDE = {
  items: {
    include: PERIOD_ITEM_INCLUDE,
    orderBy: { employee: { code: 'asc' } },
  },
  _count: { select: { items: true } },
} as const satisfies Prisma.PayrollPeriodInclude;

@Injectable()
export class PayrollPeriodRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string, where: Prisma.PayrollPeriodWhereInput = {}) {
    return this.prisma.payrollPeriod.findMany({
      where: { organizationId, ...where },
      orderBy: { monthKey: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.payrollPeriod.findFirst({
      where: { id, organizationId },
      include: PERIOD_FULL_INCLUDE,
    });
  }

  findByMonthKeyByOrg(organizationId: string, monthKey: string) {
    return this.prisma.payrollPeriod.findUnique({
      where: { organizationId_monthKey: { organizationId, monthKey } },
    });
  }

  create(data: Prisma.PayrollPeriodUncheckedCreateInput) {
    return this.prisma.payrollPeriod.create({ data });
  }

  update(id: string, data: Prisma.PayrollPeriodUncheckedUpdateInput) {
    return this.prisma.payrollPeriod.update({
      where: { id },
      data,
      include: PERIOD_FULL_INCLUDE,
    });
  }

  remove(id: string) {
    // Cascade deletes items via Prisma onDelete: Cascade on PayrollItem.
    return this.prisma.payrollPeriod.delete({ where: { id } });
  }

  /**
   * Sum of all items.netPay for the period — header KPI without loading
   * every row. Returns 0 when the period has no items yet.
   */
  async sumNetPay(periodId: string): Promise<number> {
    const agg = await this.prisma.payrollItem.aggregate({
      where: { periodId },
      _sum: { netPay: true },
    });
    return agg._sum.netPay?.toNumber() ?? 0;
  }
}
