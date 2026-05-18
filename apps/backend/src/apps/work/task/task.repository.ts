import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const USER_SUMMARY = {
  select: { id: true, name: true, email: true, avatar: true },
} as const;

const TASK_LIST_INCLUDE = {
  assignee: USER_SUMMARY,
  reporter: USER_SUMMARY,
  section: { select: { id: true, name: true, order: true } },
  project: {
    select: { id: true, name: true, slug: true, color: true, icon: true },
  },
  _count: { select: { subtasks: { where: { deletedAt: null } }, watchers: true } },
} as const satisfies Prisma.TaskInclude;

const TASK_DETAIL_INCLUDE = {
  ...TASK_LIST_INCLUDE,
  parent: {
    select: { id: true, code: true, title: true },
  },
  subtasks: {
    where: { deletedAt: null },
    orderBy: { order: 'asc' },
    include: {
      assignee: USER_SUMMARY,
      reporter: USER_SUMMARY,
    },
  },
  watchers: {
    include: { user: USER_SUMMARY },
  },
} as const satisfies Prisma.TaskInclude;

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string, where: Prisma.TaskWhereInput = {}) {
    return this.prisma.task.findMany({
      where: { organizationId, deletedAt: null, ...where },
      orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }, { createdAt: 'asc' }],
      include: TASK_LIST_INCLUDE,
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.task.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: TASK_DETAIL_INCLUDE,
    });
  }

  findByCodeByOrg(organizationId: string, code: string) {
    return this.prisma.task.findFirst({
      where: { organizationId, code, deletedAt: null },
      include: TASK_DETAIL_INCLUDE,
    });
  }

  softDelete(id: string) {
    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const TASK_LIST_INCLUDE_CONST = TASK_LIST_INCLUDE;
export const TASK_DETAIL_INCLUDE_CONST = TASK_DETAIL_INCLUDE;
