import { Injectable } from '@nestjs/common';
import { EmployeeStatus, Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

interface ListFilter {
  departmentId?: string;
  status?: EmployeeStatus;
  q?: string;
  skip?: number;
  take?: number;
}

// Personal info now lives on User. Always pull a small slice so callers
// don't have to remember to include it.
const USER_VIEW = {
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      dob: true,
      gender: true,
      phone: true,
      role: true,
    },
  },
} as const satisfies Prisma.EmployeeInclude;

@Injectable()
export class EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  buildWhere(organizationId: string, filter: ListFilter): Prisma.EmployeeWhereInput {
    const where: Prisma.EmployeeWhereInput = {
      organizationId,
      deletedAt: null,
    };
    if (filter.departmentId) where.departmentId = filter.departmentId;
    if (filter.status) where.status = filter.status;
    if (filter.q) {
      const q = filter.q;
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { user: { is: { name: { contains: q, mode: 'insensitive' } } } },
        { user: { is: { email: { contains: q, mode: 'insensitive' } } } },
      ];
    }
    return where;
  }

  findManyByOrg(organizationId: string, filter: ListFilter) {
    const where = this.buildWhere(organizationId, filter);
    return this.prisma.employee.findMany({
      where,
      orderBy: { code: 'asc' },
      skip: filter.skip,
      take: filter.take,
      include: USER_VIEW,
    });
  }

  countByOrg(organizationId: string, filter: ListFilter) {
    return this.prisma.employee.count({ where: this.buildWhere(organizationId, filter) });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.employee.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: USER_VIEW,
    });
  }

  /** Cheap existence check for FK validation (e.g. Department.managerId). */
  existsInOrg(organizationId: string, id: string) {
    return this.prisma.employee
      .findFirst({
        where: { id, organizationId, deletedAt: null },
        select: { id: true },
      })
      .then((row) => !!row);
  }

  create(data: Prisma.EmployeeUncheckedCreateInput) {
    return this.prisma.employee.create({ data });
  }

  update(id: string, data: Prisma.EmployeeUncheckedUpdateInput) {
    return this.prisma.employee.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
