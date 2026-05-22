import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const USER_SUMMARY = {
  select: { id: true, name: true, email: true, avatar: true },
} as const;

const DEPT_SUMMARY = {
  select: { id: true, name: true, code: true },
} as const;

const FULL_INCLUDE = {
  hiringManager: USER_SUMMARY,
  createdBy: USER_SUMMARY,
  department: DEPT_SUMMARY,
  stages: { orderBy: { order: 'asc' } },
  _count: { select: { applications: true } },
} as const satisfies Prisma.JobInclude;

@Injectable()
export class JobRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string, where: Prisma.JobWhereInput = {}) {
    return this.prisma.job.findMany({
      where: { organizationId, deletedAt: null, ...where },
      orderBy: { updatedAt: 'desc' },
      include: FULL_INCLUDE,
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.job.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: FULL_INCLUDE,
    });
  }

  findBySlugByOrg(organizationId: string, slug: string) {
    return this.prisma.job.findFirst({
      where: { organizationId, slug, deletedAt: null },
      include: FULL_INCLUDE,
    });
  }

  slugExists(slug: string) {
    return this.prisma.job
      .findFirst({ where: { slug }, select: { id: true } })
      .then((row) => !!row);
  }

  /** Counts non-deleted jobs in org — used to mint the next "JOB-N" code. */
  countByOrg(organizationId: string) {
    return this.prisma.job.count({
      where: { organizationId, deletedAt: null },
    });
  }

  update(id: string, data: Prisma.JobUncheckedUpdateInput) {
    return this.prisma.job.update({
      where: { id },
      data,
      include: FULL_INCLUDE,
    });
  }

  softDelete(id: string) {
    return this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const JOB_FULL_INCLUDE = FULL_INCLUDE;
