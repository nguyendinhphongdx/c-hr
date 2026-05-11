import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus, OnboardingPlanStatus, OnboardingTaskStatus, Prisma } from '@prisma/client';
import { addDays } from 'date-fns';

import { ActivityService } from '@/apps/collaboration/activity/activity.service';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { resolveAssignee } from '../lifecycle/assignee-resolver';

import { AddTaskDto, CreatePlanDto, ListPlansDto } from './dto';
import { OnboardingPlanAcl, OnboardingPlanAclSubject } from './onboarding-plan.acl';
import { OnboardingPlanRepository, PLAN_FULL_INCLUDE } from './onboarding-plan.repository';

const TASK_ORDER_STEP = 1000;

type PlanFull = Prisma.OnboardingPlanGetPayload<{ include: typeof PLAN_FULL_INCLUDE }>;

@Injectable()
export class OnboardingPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: OnboardingPlanRepository,
    private readonly activities: ActivityService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Reads
  // ──────────────────────────────────────────────────────────────────

  async list(query: ListPlansDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();
    const isAdmin = this.ctx.isAppAdmin('HRM', orgId);

    const where: Prisma.OnboardingPlanWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.employeeId) where.employeeId = query.employeeId;

    if (!isAdmin) {
      // Non-admin: only plans where caller is the employee or a task assignee.
      where.OR = [
        { employee: { user: { id: callerId } } },
        { tasks: { some: { assigneeId: callerId } } },
      ];
    }

    return this.repo.findManyByOrg(orgId, where);
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Onboarding plan not found');

    const acl = this.buildAcl(row);
    await acl.require('canView');
    return { ...row, view: await acl.getAcl() };
  }

  async findByEmployee(employeeId: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByEmployeeByOrg(orgId, employeeId);
    if (!row) throw new NotFoundException('Onboarding plan not found');

    const acl = this.buildAcl(row);
    await acl.require('canView');
    return { ...row, view: await acl.getAcl() };
  }

  // ──────────────────────────────────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────────────────────────────────

  async create(dto: CreatePlanDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);
    const userId = this.ctx.requireUserId();

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, organizationId: orgId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!employee) throw new BadRequestException('Employee not found in organization');
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Employee is not active');
    }

    const template = await this.prisma.onboardingTemplate.findFirst({
      where: {
        id: dto.templateId,
        organizationId: orgId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true },
    });
    if (!template) throw new BadRequestException('Template not found or inactive');

    const existing = await this.prisma.onboardingPlan.findUnique({
      where: { employeeId: dto.employeeId },
      select: { id: true, status: true },
    });
    if (existing && existing.status !== OnboardingPlanStatus.ARCHIVED) {
      throw new ConflictException('Nhân viên đã có kế hoạch onboarding đang hoạt động');
    }

    return this.createFromTemplate(dto.employeeId, dto.templateId, userId);
  }

  /**
   * Snapshot the template + spawn one OnboardingTask per template-task.
   * Also called from the EmployeeLifecycleListener (system-driven, so the
   * caller passes its own `createdById`). Schema enforces unique employeeId
   * — caller must ensure no active plan exists for ACTIVE employees.
   */
  async createFromTemplate(
    employeeId: string,
    templateId: string,
    createdById: string,
  ): Promise<PlanFull> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        organizationId: true,
        hireDate: true,
        user: { select: { id: true } },
      },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const template = await this.prisma.onboardingTemplate.findUnique({
      where: { id: templateId },
      include: { tasks: { orderBy: { order: 'asc' } } },
    });
    if (!template) throw new NotFoundException('Template not found');
    if (template.organizationId !== employee.organizationId) {
      throw new BadRequestException('Template does not belong to employee organization');
    }

    const orgId = employee.organizationId;

    // Resolve assignees BEFORE the transaction so we don't hold the tx
    // open during many small reads.
    const resolved: Array<{
      templateTaskId: string;
      title: string;
      description: string | null;
      order: number;
      assigneeId: string;
      dueDate: Date | null;
    }> = [];

    for (const t of template.tasks) {
      const assigneeId = await resolveAssignee({
        prisma: this.prisma,
        organizationId: orgId,
        employeeId: employee.id,
        role: t.defaultAssigneeRole,
        customUserId: t.defaultAssigneeUserId,
        fallbackUserId: createdById,
      });
      const dueDate =
        employee.hireDate != null ? addDays(employee.hireDate, t.dueOffsetDays) : null;
      resolved.push({
        templateTaskId: t.id,
        title: t.title,
        description: t.description,
        order: t.order,
        assigneeId,
        dueDate,
      });
    }

    const plan = await this.prisma.$transaction(async (tx) => {
      const created = await tx.onboardingPlan.create({
        data: {
          organizationId: orgId,
          employeeId: employee.id,
          templateId: template.id,
          templateNameSnapshot: template.name,
          status: OnboardingPlanStatus.PENDING,
          createdById,
        },
      });

      if (resolved.length > 0) {
        await tx.onboardingTask.createMany({
          data: resolved.map((r) => ({
            organizationId: orgId,
            planId: created.id,
            templateTaskId: r.templateTaskId,
            title: r.title,
            description: r.description,
            order: r.order,
            assigneeId: r.assigneeId,
            dueDate: r.dueDate,
            status: OnboardingTaskStatus.TODO,
          })),
        });
      }

      return tx.onboardingPlan.findUniqueOrThrow({
        where: { id: created.id },
        include: PLAN_FULL_INCLUDE,
      });
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'OnboardingPlan',
      objectId: plan.id,
      objectLabel: plan.templateNameSnapshot,
      action: 'onboarding.plan_created',
      userId: createdById,
      metadata: { employeeId: employee.id, templateId: template.id },
    });

    return plan;
  }

  async archive(id: string) {
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.requireUserId();

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Onboarding plan not found');

    const acl = this.buildAcl(row);
    await acl.require('canEdit');
    if (row.status === OnboardingPlanStatus.ARCHIVED) {
      return { ...row, view: await acl.getAcl() };
    }

    await this.prisma.onboardingPlan.update({
      where: { id },
      data: { status: OnboardingPlanStatus.ARCHIVED },
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'OnboardingPlan',
      objectId: id,
      objectLabel: row.templateNameSnapshot,
      action: 'onboarding.plan_archived',
      userId,
    });

    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) throw new NotFoundException('Plan disappeared after archive');
    return { ...updated, view: await this.buildAcl(updated).getAcl() };
  }

  async remove(id: string) {
    const orgId = this.ctx.requireOrg();

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Onboarding plan not found');

    await this.buildAcl(row).require('canDelete');

    await this.prisma.onboardingPlan.delete({ where: { id } });
    return { id, success: true as const };
  }

  async addTask(planId: string, dto: AddTaskDto) {
    const orgId = this.ctx.requireOrg();

    const plan = await this.repo.findByIdByOrg(orgId, planId);
    if (!plan) throw new NotFoundException('Onboarding plan not found');

    await this.buildAcl(plan).require('canEdit');

    const assignee = await this.prisma.user.findFirst({
      where: { id: dto.assigneeUserId, organizationId: orgId },
      select: { id: true },
    });
    if (!assignee) {
      throw new BadRequestException('Assignee not in organization');
    }

    const order = dto.order ?? (await this.repo.maxTaskOrder(planId)) + TASK_ORDER_STEP;

    const task = await this.prisma.onboardingTask.create({
      data: {
        organizationId: orgId,
        planId,
        templateTaskId: null,
        title: dto.title,
        description: dto.description ?? null,
        order,
        assigneeId: dto.assigneeUserId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        status: OnboardingTaskStatus.TODO,
      },
    });

    return task;
  }

  // ──────────────────────────────────────────────────────────────────
  // Transition logic — called by OnboardingTaskService after mutations
  // ──────────────────────────────────────────────────────────────────

  /**
   * Re-evaluate plan status after a task transition. Idempotent. ARCHIVED
   * is terminal — never auto-transitions out.
   *
   * - PENDING + at least 1 DONE  → IN_PROGRESS (startedAt = now)
   * - IN_PROGRESS + all DONE     → COMPLETED (completedAt = now)
   * - COMPLETED + some TODO      → IN_PROGRESS (clear completedAt)
   */
  async checkTransition(planId: string): Promise<void> {
    const plan = await this.prisma.onboardingPlan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        templateNameSnapshot: true,
        tasks: { select: { status: true } },
      },
    });
    if (!plan) return;
    if (plan.status === OnboardingPlanStatus.ARCHIVED) return;

    const total = plan.tasks.length;
    const doneCount = plan.tasks.filter((t) => t.status === OnboardingTaskStatus.DONE).length;
    const allDone = total > 0 && doneCount === total;
    const someDone = doneCount > 0;

    let next: OnboardingPlanStatus | null = null;
    const data: Prisma.OnboardingPlanUncheckedUpdateInput = {};

    if (plan.status === OnboardingPlanStatus.PENDING && someDone) {
      next = OnboardingPlanStatus.IN_PROGRESS;
      data.status = next;
      data.startedAt = new Date();
    } else if (plan.status === OnboardingPlanStatus.IN_PROGRESS && allDone) {
      next = OnboardingPlanStatus.COMPLETED;
      data.status = next;
      data.completedAt = new Date();
    } else if (plan.status === OnboardingPlanStatus.COMPLETED && !allDone) {
      next = OnboardingPlanStatus.IN_PROGRESS;
      data.status = next;
      data.completedAt = null;
    }

    if (!next) return;

    await this.prisma.onboardingPlan.update({ where: { id: plan.id }, data });

    if (next === OnboardingPlanStatus.COMPLETED) {
      this.activities.log({
        organizationId: plan.organizationId,
        objectType: 'OnboardingPlan',
        objectId: plan.id,
        objectLabel: plan.templateNameSnapshot,
        action: 'onboarding.plan_completed',
        userId: this.ctx.userId ?? null,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private buildAcl(row: PlanFull): OnboardingPlanAcl {
    const subject: OnboardingPlanAclSubject = {
      id: row.id,
      organizationId: row.organizationId,
      status: row.status,
      employeeId: row.employeeId,
      _employeeUserId: row.employee.user?.id ?? null,
      _taskAssigneeUserIds: row.tasks.map((t) => t.assigneeId),
    };
    return new OnboardingPlanAcl(subject);
  }
}
