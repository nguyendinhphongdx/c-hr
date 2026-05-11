import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const USER_SUMMARY = {
  select: { id: true, name: true, email: true, avatar: true },
} as const;

const TIMER_TASK_INCLUDE = {
  task: {
    select: {
      id: true,
      code: true,
      title: true,
      projectId: true,
      organizationId: true,
      project: {
        select: { id: true, name: true, slug: true, color: true, icon: true },
      },
    },
  },
} as const satisfies Prisma.TaskTimerInclude;

const TIMER_FULL_INCLUDE = {
  ...TIMER_TASK_INCLUDE,
  user: USER_SUMMARY,
} as const satisfies Prisma.TaskTimerInclude;

@Injectable()
export class TaskTimerRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.taskTimer.findUnique({
      where: { id },
      include: TIMER_FULL_INCLUDE,
    });
  }

  /** Returns the caller's currently-running timer, or null. */
  findRunningForUser(userId: string) {
    return this.prisma.taskTimer.findFirst({
      where: { userId, stoppedAt: null },
      include: TIMER_FULL_INCLUDE,
      orderBy: { startedAt: 'desc' },
    });
  }

  findManyForTask(taskId: string, limit = 20) {
    return this.prisma.taskTimer.findMany({
      where: { taskId },
      include: TIMER_FULL_INCLUDE,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  findManyByFilter(where: Prisma.TaskTimerWhereInput, limit = 100) {
    return this.prisma.taskTimer.findMany({
      where,
      include: TIMER_FULL_INCLUDE,
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}

export const TIMER_FULL_INCLUDE_CONST = TIMER_FULL_INCLUDE;
