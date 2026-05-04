import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class AttendanceLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByRange(
    organizationId: string,
    employeeId: string,
    from: Date,
    to: Date,
  ) {
    return this.prisma.attendanceLog.findMany({
      where: {
        organizationId,
        employeeId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.attendanceLog.findFirst({
      where: { id, organizationId },
    });
  }

  update(id: string, data: Prisma.AttendanceLogUncheckedUpdateInput) {
    return this.prisma.attendanceLog.update({ where: { id }, data });
  }
}
