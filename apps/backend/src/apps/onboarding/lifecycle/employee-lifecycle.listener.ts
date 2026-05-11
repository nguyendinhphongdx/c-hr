import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OnboardingPlanStatus } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

import { OnboardingPlanService } from '../plan/onboarding-plan.service';

interface EmployeeCreatedEvent {
  employeeId: string;
  createdById: string;
}

interface EmployeeTerminatedEvent {
  employeeId: string;
}

/**
 * Bridges Employee lifecycle into Onboarding:
 *  - `employee.created`    → auto-apply org's default OnboardingTemplate.
 *  - `employee.terminated` → archive the active OnboardingPlan.
 *
 * Failures are logged + swallowed so Employee writes never break when
 * Onboarding setup has a hiccup (no default template, listener bug, ...).
 */
@Injectable()
export class EmployeeLifecycleListener {
  private readonly logger = new Logger(EmployeeLifecycleListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planService: OnboardingPlanService,
  ) {}

  @OnEvent('employee.created', { async: true })
  async onEmployeeCreated(payload: EmployeeCreatedEvent): Promise<void> {
    try {
      const employee = await this.prisma.employee.findUnique({
        where: { id: payload.employeeId },
        select: { id: true, organizationId: true },
      });
      if (!employee) return;

      const defaultTemplate = await this.prisma.onboardingTemplate.findFirst({
        where: {
          organizationId: employee.organizationId,
          isDefault: true,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!defaultTemplate) {
        this.logger.log(
          `No default onboarding template for org ${employee.organizationId}; skipping auto-plan for employee ${employee.id}`,
        );
        return;
      }

      await this.planService.createFromTemplate(
        employee.id,
        defaultTemplate.id,
        payload.createdById,
      );
    } catch (err) {
      this.logger.error(
        `Auto-create onboarding plan failed for employee ${payload.employeeId}: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent('employee.terminated', { async: true })
  async onEmployeeTerminated(payload: EmployeeTerminatedEvent): Promise<void> {
    try {
      const plan = await this.prisma.onboardingPlan.findUnique({
        where: { employeeId: payload.employeeId },
        select: { id: true, status: true },
      });
      if (!plan || plan.status === OnboardingPlanStatus.ARCHIVED) return;

      // System-driven — bypass ACL (no user ctx available here).
      await this.prisma.onboardingPlan.update({
        where: { id: plan.id },
        data: { status: OnboardingPlanStatus.ARCHIVED },
      });
    } catch (err) {
      this.logger.error(
        `Auto-archive onboarding plan failed for employee ${payload.employeeId}: ${(err as Error).message}`,
      );
    }
  }
}
