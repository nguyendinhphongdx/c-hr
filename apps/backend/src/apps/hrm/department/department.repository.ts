import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.department.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /** Quick existence check — used to validate parentId / managerId belong
   *  to the same Org without pulling the whole row. */
  existsInOrg(organizationId: string, id: string) {
    return this.prisma.department
      .findFirst({
        where: { id, organizationId, deletedAt: null },
        select: { id: true },
      })
      .then((row) => !!row);
  }

  create(data: Prisma.DepartmentUncheckedCreateInput) {
    return this.prisma.department.create({ data });
  }

  update(id: string, data: Prisma.DepartmentUncheckedUpdateInput) {
    return this.prisma.department.update({ where: { id }, data });
  }

  /** Soft-delete — sets deleted_at; row stays for history. */
  softDelete(id: string) {
    return this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
