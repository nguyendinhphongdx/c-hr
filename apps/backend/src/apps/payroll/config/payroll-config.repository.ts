import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class PayrollConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByOrgYear(organizationId: string, year: number) {
    return this.prisma.payrollConfig.findUnique({
      where: { organizationId_year: { organizationId, year } },
    });
  }

  findAllByOrg(organizationId: string) {
    return this.prisma.payrollConfig.findMany({
      where: { organizationId },
      orderBy: { year: 'desc' },
    });
  }

  create(data: Prisma.PayrollConfigUncheckedCreateInput) {
    return this.prisma.payrollConfig.create({ data });
  }

  update(id: string, data: Prisma.PayrollConfigUncheckedUpdateInput) {
    return this.prisma.payrollConfig.update({ where: { id }, data });
  }
}
