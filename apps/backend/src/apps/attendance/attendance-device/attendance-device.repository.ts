import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class AttendanceDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string) {
    return this.prisma.attendanceDevice.findMany({
      where: { organizationId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.attendanceDevice.findFirst({
      where: { id, organizationId },
    });
  }

  /** Used by the public push endpoint — bypass tenant scope intentionally. */
  findByIdRaw(id: string) {
    return this.prisma.attendanceDevice.findUnique({ where: { id } });
  }

  create(data: Prisma.AttendanceDeviceUncheckedCreateInput) {
    return this.prisma.attendanceDevice.create({ data });
  }

  update(id: string, data: Prisma.AttendanceDeviceUncheckedUpdateInput) {
    return this.prisma.attendanceDevice.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.attendanceDevice.delete({ where: { id } });
  }
}
