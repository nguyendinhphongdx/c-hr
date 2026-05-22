import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const USER_SUMMARY = {
  select: { id: true, name: true, email: true, avatar: true },
} as const;

const FULL_INCLUDE = {
  createdBy: USER_SUMMARY,
  user: USER_SUMMARY,
  employee: { select: { id: true, code: true } },
  resumes: {
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  },
  _count: { select: { applications: true } },
} as const satisfies Prisma.CandidateInclude;

@Injectable()
export class CandidateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(
    organizationId: string,
    where: Prisma.CandidateWhereInput = {},
  ) {
    return this.prisma.candidate.findMany({
      where: { organizationId, deletedAt: null, ...where },
      orderBy: { updatedAt: 'desc' },
      include: FULL_INCLUDE,
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.candidate.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: FULL_INCLUDE,
    });
  }

  findByEmailByOrg(organizationId: string, email: string) {
    return this.prisma.candidate.findFirst({
      where: { organizationId, email, deletedAt: null },
      include: FULL_INCLUDE,
    });
  }

  update(id: string, data: Prisma.CandidateUncheckedUpdateInput) {
    return this.prisma.candidate.update({
      where: { id },
      data,
      include: FULL_INCLUDE,
    });
  }

  softDelete(id: string) {
    return this.prisma.candidate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const CANDIDATE_FULL_INCLUDE = FULL_INCLUDE;
