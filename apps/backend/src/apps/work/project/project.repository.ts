import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const USER_SUMMARY = {
  select: { id: true, name: true, email: true, avatar: true },
} as const;

const MEMBER_INCLUDE = {
  user: USER_SUMMARY,
} as const;

const FULL_INCLUDE = {
  owner: USER_SUMMARY,
  members: { include: MEMBER_INCLUDE },
  sections: { orderBy: { order: 'asc' } },
} as const satisfies Prisma.ProjectInclude;

@Injectable()
export class ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists projects by org, applying caller-side filter via `where` (e.g.
   * "I'm a member" / "PUBLIC same-org"). Soft-deleted rows excluded.
   */
  findManyByOrg(organizationId: string, where: Prisma.ProjectWhereInput = {}) {
    return this.prisma.project.findMany({
      where: { organizationId, deletedAt: null, ...where },
      orderBy: { updatedAt: 'desc' },
      include: FULL_INCLUDE,
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.project.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: FULL_INCLUDE,
    });
  }

  findBySlugByOrg(organizationId: string, slug: string) {
    return this.prisma.project.findFirst({
      where: { organizationId, slug, deletedAt: null },
      include: FULL_INCLUDE,
    });
  }

  /** Fast `slug` collision check used while auto-generating. */
  slugExistsInOrg(organizationId: string, slug: string) {
    return this.prisma.project
      .findFirst({
        where: { organizationId, slug, deletedAt: null },
        select: { id: true },
      })
      .then((row) => !!row);
  }

  update(id: string, data: Prisma.ProjectUncheckedUpdateInput) {
    return this.prisma.project.update({
      where: { id },
      data,
      include: FULL_INCLUDE,
    });
  }

  softDelete(id: string) {
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const PROJECT_FULL_INCLUDE = FULL_INCLUDE;
