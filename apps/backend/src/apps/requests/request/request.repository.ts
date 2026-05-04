import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const PARTICIPANT_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
} as const;

const FULL_INCLUDE = {
  group: true,
  requester: { select: { id: true, code: true, ...PARTICIPANT_INCLUDE } },
  approver: { select: { id: true, code: true, ...PARTICIPANT_INCLUDE } },
} as const;

@Injectable()
export class RequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string, where: Prisma.RequestWhereInput = {}) {
    return this.prisma.request.findMany({
      where: { ...where, organizationId },
      orderBy: { createdAt: 'desc' },
      include: FULL_INCLUDE,
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.request.findFirst({
      where: { id, organizationId },
      include: FULL_INCLUDE,
    });
  }

  create(data: Prisma.RequestUncheckedCreateInput) {
    return this.prisma.request.create({ data, include: FULL_INCLUDE });
  }

  update(id: string, data: Prisma.RequestUncheckedUpdateInput) {
    return this.prisma.request.update({
      where: { id },
      data,
      include: FULL_INCLUDE,
    });
  }
}
