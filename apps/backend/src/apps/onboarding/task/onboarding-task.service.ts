import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OnboardingPlanStatus, OnboardingTaskStatus, Prisma } from '@prisma/client';

import { ActivityService } from '@/apps/collaboration/activity/activity.service';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { OnboardingPlanService } from '../plan/onboarding-plan.service';

import { CompleteTaskDto, ReassignTaskDto, UpdateTaskDto } from './dto';
import { OnboardingTaskAcl, OnboardingTaskAclSubject } from './onboarding-task.acl';
import { OnboardingTaskRepository, TASK_FULL_INCLUDE } from './onboarding-task.repository';

type TaskFull = Prisma.OnboardingTaskGetPayload<{ include: typeof TASK_FULL_INCLUDE }>;

@Injectable()
export class OnboardingTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: OnboardingTaskRepository,
    private readonly activities: ActivityService,
    private readonly planService: OnboardingPlanService,
  ) {}

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Onboarding task not found');

    const acl = this.buildAcl(row);
    await acl.require('canView');
    return { ...row, view: await acl.getAcl() };
  }

  async complete(id: string, dto: CompleteTaskDto) {
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.requireUserId();

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Onboarding task not found');

    if (row.plan.status === OnboardingPlanStatus.ARCHIVED) {
      throw new BadRequestException('Plan is archived');
    }

    const acl = this.buildAcl(row);
    if (!acl.canComplete()) {
      throw new ForbiddenException('Not allowed: canComplete');
    }

    if (row.status === OnboardingTaskStatus.DONE) {
      return { ...row, view: await acl.getAcl() };
    }

    await this.prisma.onboardingTask.update({
      where: { id },
      data: {
        status: OnboardingTaskStatus.DONE,
        completedAt: new Date(),
        completedById: userId,
        completedNote: dto.note ?? null,
      },
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'OnboardingTask',
      objectId: id,
      objectLabel: row.title,
      action: 'onboarding.task_completed',
      userId,
      metadata: { planId: row.planId },
    });

    await this.planService.checkTransition(row.planId);

    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) throw new NotFoundException('Task disappeared after complete');
    return { ...updated, view: await this.buildAcl(updated).getAcl() };
  }

  async uncomplete(id: string) {
    const orgId = this.ctx.requireOrg();

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Onboarding task not found');

    if (row.plan.status === OnboardingPlanStatus.ARCHIVED) {
      throw new BadRequestException('Plan is archived');
    }

    const acl = this.buildAcl(row);
    if (!acl.canComplete()) {
      throw new ForbiddenException('Not allowed: canComplete');
    }

    if (row.status === OnboardingTaskStatus.TODO) {
      return { ...row, view: await acl.getAcl() };
    }

    await this.prisma.onboardingTask.update({
      where: { id },
      data: {
        status: OnboardingTaskStatus.TODO,
        completedAt: null,
        completedById: null,
        completedNote: null,
      },
    });

    await this.planService.checkTransition(row.planId);

    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) throw new NotFoundException('Task disappeared after uncomplete');
    return { ...updated, view: await this.buildAcl(updated).getAcl() };
  }

  async reassign(id: string, dto: ReassignTaskDto) {
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.requireUserId();

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Onboarding task not found');

    if (!this.buildAcl(row).canReassign()) {
      throw new ForbiddenException('Not allowed: canReassign');
    }

    const newAssignee = await this.prisma.user.findFirst({
      where: { id: dto.assigneeUserId, organizationId: orgId },
      select: { id: true },
    });
    if (!newAssignee) {
      throw new BadRequestException('Assignee not in organization');
    }

    if (newAssignee.id === row.assigneeId) {
      return { ...row, view: await this.buildAcl(row).getAcl() };
    }

    const previous = row.assigneeId;

    await this.prisma.onboardingTask.update({
      where: { id },
      data: { assigneeId: newAssignee.id },
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'OnboardingTask',
      objectId: id,
      objectLabel: row.title,
      action: 'onboarding.task_reassigned',
      userId,
      metadata: { from: previous, to: newAssignee.id, note: dto.note ?? null },
    });

    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) throw new NotFoundException('Task disappeared after reassign');
    return { ...updated, view: await this.buildAcl(updated).getAcl() };
  }

  async update(id: string, dto: UpdateTaskDto) {
    const orgId = this.ctx.requireOrg();

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Onboarding task not found');

    if (row.plan.status === OnboardingPlanStatus.ARCHIVED) {
      throw new BadRequestException('Plan is archived');
    }

    await this.buildAcl(row).require('canEdit');

    const data: Prisma.OnboardingTaskUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    await this.prisma.onboardingTask.update({ where: { id }, data });

    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) throw new NotFoundException('Task disappeared after update');
    return { ...updated, view: await this.buildAcl(updated).getAcl() };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private buildAcl(row: TaskFull): OnboardingTaskAcl {
    const subject: OnboardingTaskAclSubject = {
      id: row.id,
      organizationId: row.organizationId,
      assigneeId: row.assigneeId,
      status: row.status,
      _planStatus: row.plan.status,
      _planEmployeeUserId: row.plan.employee.user?.id ?? null,
    };
    return new OnboardingTaskAcl(subject);
  }
}
