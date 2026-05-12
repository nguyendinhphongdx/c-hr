import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class HolidayRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string, where: Prisma.HolidayWhereInput = {}) {
    return this.prisma.holiday.findMany({
      where: { ...where, organizationId, deletedAt: null },
      orderBy: [{ date: 'asc' }],
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.holiday.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }

  findByDateByOrg(organizationId: string, date: Date) {
    return this.prisma.holiday.findFirst({
      where: { organizationId, date, deletedAt: null },
    });
  }

  create(data: Prisma.HolidayUncheckedCreateInput) {
    return this.prisma.holiday.create({ data });
  }

  update(id: string, data: Prisma.HolidayUncheckedUpdateInput) {
    return this.prisma.holiday.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.holiday.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
