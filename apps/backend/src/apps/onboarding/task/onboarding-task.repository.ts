import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

export const TASK_FULL_INCLUDE = {
  plan: {
    select: {
      id: true,
      status: true,
      templateNameSnapshot: true,
      employee: {
        select: {
          id: true,
          code: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
} satisfies Prisma.OnboardingTaskInclude;

@Injectable()
export class OnboardingTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.onboardingTask.findFirst({
      where: { id, organizationId },
      include: TASK_FULL_INCLUDE,
    });
  }
}
