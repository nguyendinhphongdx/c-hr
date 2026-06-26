import { Injectable } from '@nestjs/common';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class WorkScheduleRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * All non-deleted schedules for the org, sorted newest-first.
   * Used by the list endpoint and by timesheet services to load the full
   * timeline in one query then resolve per-date in memory.
   */
  findManyByOrg(organizationId: string) {
    return this.prisma.workSchedule.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: [{ effectiveFrom: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }],
      include: { shifts: { orderBy: { name: 'asc' } } },
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.workSchedule.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { shifts: { orderBy: { name: 'asc' } } },
    });
  }
}
