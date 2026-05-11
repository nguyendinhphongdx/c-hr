import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

export const PLAN_FULL_INCLUDE = {
  tasks: { orderBy: { order: 'asc' as const } },
  employee: {
    select: {
      id: true,
      code: true,
      title: true,
      hireDate: true,
      user: { select: { id: true, name: true, email: true, avatar: true } },
      department: { select: { id: true, name: true } },
    },
  },
  template: { select: { id: true, name: true } },
} satisfies Prisma.OnboardingPlanInclude;

@Injectable()
export class OnboardingPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string, where: Prisma.OnboardingPlanWhereInput) {
    return this.prisma.onboardingPlan.findMany({
      where: { organizationId, ...where },
      include: PLAN_FULL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.onboardingPlan.findFirst({
      where: { id, organizationId },
      include: PLAN_FULL_INCLUDE,
    });
  }

  findByEmployeeByOrg(organizationId: string, employeeId: string) {
    return this.prisma.onboardingPlan.findFirst({
      where: { organizationId, employeeId },
      include: PLAN_FULL_INCLUDE,
    });
  }

  /** Hot-path lookup (no include) — used inside lifecycle hooks. */
  findRawByIdByOrg(organizationId: string, id: string) {
    return this.prisma.onboardingPlan.findFirst({
      where: { id, organizationId },
    });
  }

  /** Returns max(order) for the plan, or -1 if empty. */
  async maxTaskOrder(planId: string): Promise<number> {
    const row = await this.prisma.onboardingTask.findFirst({
      where: { planId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return row?.order ?? -1;
  }
}
