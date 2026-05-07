import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const DEPARTMENT_INCLUDE = {
  managingDepartment: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ResourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string, where: Prisma.ResourceWhereInput = {}) {
    return this.prisma.resource.findMany({
      where: { ...where, organizationId, deletedAt: null },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
      include: DEPARTMENT_INCLUDE,
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.resource.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: DEPARTMENT_INCLUDE,
    });
  }

  findManyByIds(organizationId: string, ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.resource.findMany({
      where: {
        organizationId,
        deletedAt: null,
        isActive: true,
        id: { in: ids },
      },
      select: { id: true, name: true },
    });
  }

  create(data: Prisma.ResourceUncheckedCreateInput) {
    return this.prisma.resource.create({ data, include: DEPARTMENT_INCLUDE });
  }

  update(id: string, data: Prisma.ResourceUncheckedUpdateInput) {
    return this.prisma.resource.update({
      where: { id },
      data,
      include: DEPARTMENT_INCLUDE,
    });
  }

  softDelete(id: string) {
    return this.prisma.resource.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
