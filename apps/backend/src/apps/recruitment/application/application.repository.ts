import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const USER_SUMMARY = {
  select: { id: true, name: true, email: true, avatar: true },
} as const;

const FULL_INCLUDE = {
  candidate: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      headline: true,
      source: true,
      employeeId: true,
    },
  },
  job: {
    select: { id: true, code: true, slug: true, title: true, status: true },
  },
  stage: true,
  resume: {
    select: { id: true, filename: true, url: true, mimeType: true },
  },
} as const satisfies Prisma.ApplicationInclude;

@Injectable()
export class ApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(
    organizationId: string,
    where: Prisma.ApplicationWhereInput = {},
  ) {
    return this.prisma.application.findMany({
      where: { organizationId, ...where },
      orderBy: { appliedAt: 'desc' },
      include: FULL_INCLUDE,
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.application.findFirst({
      where: { id, organizationId },
      include: FULL_INCLUDE,
    });
  }

  findByPair(candidateId: string, jobId: string) {
    return this.prisma.application.findFirst({
      where: { candidateId, jobId },
      include: FULL_INCLUDE,
    });
  }

  update(id: string, data: Prisma.ApplicationUncheckedUpdateInput) {
    return this.prisma.application.update({
      where: { id },
      data,
      include: FULL_INCLUDE,
    });
  }
}

export const APPLICATION_FULL_INCLUDE = FULL_INCLUDE;
