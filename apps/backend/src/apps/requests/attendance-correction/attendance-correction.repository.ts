import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const PARTICIPANT_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class AttendanceCorrectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(
    organizationId: string,
    where: Prisma.AttendanceCorrectionWhereInput = {},
  ) {
    return this.prisma.attendanceCorrection.findMany({
      where: { ...where, organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, code: true, ...PARTICIPANT_INCLUDE } },
        approver: { select: { id: true, code: true, ...PARTICIPANT_INCLUDE } },
      },
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.attendanceCorrection.findFirst({
      where: { id, organizationId },
      include: {
        requester: { select: { id: true, code: true, ...PARTICIPANT_INCLUDE } },
        approver: { select: { id: true, code: true, ...PARTICIPANT_INCLUDE } },
      },
    });
  }

  create(data: Prisma.AttendanceCorrectionUncheckedCreateInput) {
    return this.prisma.attendanceCorrection.create({
      data,
      include: {
        requester: { select: { id: true, code: true, ...PARTICIPANT_INCLUDE } },
        approver: { select: { id: true, code: true, ...PARTICIPANT_INCLUDE } },
      },
    });
  }

  update(id: string, data: Prisma.AttendanceCorrectionUncheckedUpdateInput) {
    return this.prisma.attendanceCorrection.update({
      where: { id },
      data,
      include: {
        requester: { select: { id: true, code: true, ...PARTICIPANT_INCLUDE } },
        approver: { select: { id: true, code: true, ...PARTICIPANT_INCLUDE } },
      },
    });
  }

  countPendingByApprover(organizationId: string, approverEmployeeId: string) {
    return this.prisma.attendanceCorrection.count({
      where: { organizationId, approverId: approverEmployeeId, status: 'PENDING' },
    });
  }
}
