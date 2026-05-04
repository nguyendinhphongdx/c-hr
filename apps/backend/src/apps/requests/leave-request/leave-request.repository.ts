import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const REQUESTER_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
} as const;

@Injectable()
export class LeaveRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string, where: Prisma.LeaveRequestWhereInput = {}) {
    return this.prisma.leaveRequest.findMany({
      where: { ...where, organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        requester: { select: { id: true, code: true, ...REQUESTER_INCLUDE } },
        approver: { select: { id: true, code: true, ...REQUESTER_INCLUDE } },
      },
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.leaveRequest.findFirst({
      where: { id, organizationId },
      include: {
        requester: { select: { id: true, code: true, ...REQUESTER_INCLUDE } },
        approver: { select: { id: true, code: true, ...REQUESTER_INCLUDE } },
      },
    });
  }

  create(data: Prisma.LeaveRequestUncheckedCreateInput) {
    return this.prisma.leaveRequest.create({
      data,
      include: {
        requester: { select: { id: true, code: true, ...REQUESTER_INCLUDE } },
        approver: { select: { id: true, code: true, ...REQUESTER_INCLUDE } },
      },
    });
  }

  update(id: string, data: Prisma.LeaveRequestUncheckedUpdateInput) {
    return this.prisma.leaveRequest.update({
      where: { id },
      data,
      include: {
        requester: { select: { id: true, code: true, ...REQUESTER_INCLUDE } },
        approver: { select: { id: true, code: true, ...REQUESTER_INCLUDE } },
      },
    });
  }

  countPendingByApprover(organizationId: string, approverEmployeeId: string) {
    return this.prisma.leaveRequest.count({
      where: { organizationId, approverId: approverEmployeeId, status: 'PENDING' },
    });
  }
}
