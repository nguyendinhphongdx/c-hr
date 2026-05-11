import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

/**
 * Joined shape returned by detail/list endpoints. Same employee subset
 * as the period's items include, plus the parent period's status + the
 * employee's linked User.id (needed by the ACL).
 */
export const ITEM_FULL_INCLUDE = {
  employee: {
    select: {
      id: true,
      code: true,
      department: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  },
  period: {
    select: { id: true, status: true, monthKey: true, year: true, month: true },
  },
} as const satisfies Prisma.PayrollItemInclude;

@Injectable()
export class PayrollItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.payrollItem.findFirst({
      where: { id, organizationId },
      include: ITEM_FULL_INCLUDE,
    });
  }

  findManyByPeriodByOrg(
    organizationId: string,
    periodId: string,
    where: Prisma.PayrollItemWhereInput = {},
  ) {
    return this.prisma.payrollItem.findMany({
      where: { organizationId, periodId, ...where },
      include: ITEM_FULL_INCLUDE,
      orderBy: { employee: { code: 'asc' } },
    });
  }

  update(id: string, data: Prisma.PayrollItemUncheckedUpdateInput) {
    return this.prisma.payrollItem.update({
      where: { id },
      data,
      include: ITEM_FULL_INCLUDE,
    });
  }
}
