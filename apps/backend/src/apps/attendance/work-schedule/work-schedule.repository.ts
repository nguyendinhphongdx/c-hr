import { Injectable } from '@nestjs/common';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class WorkScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string) {
    return this.prisma.workSchedule.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: { shifts: { orderBy: { name: 'asc' } } },
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.workSchedule.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { shifts: { orderBy: { name: 'asc' } } },
    });
  }

  findDefaultByOrg(organizationId: string) {
    return this.prisma.workSchedule.findFirst({
      where: { organizationId, isDefault: true, deletedAt: null },
      include: { shifts: { orderBy: { name: 'asc' } } },
    });
  }
}
