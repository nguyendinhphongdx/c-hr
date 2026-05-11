import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssigneeRole, Prisma } from '@prisma/client';

import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import {
  CreateTemplateDto,
  CreateTemplateTaskDto,
  ListTemplatesDto,
  ReorderTemplateTasksDto,
  UpdateTemplateDto,
  UpdateTemplateTaskDto,
} from './dto';
import { OnboardingTemplateRepository } from './onboarding-template.repository';

const TASK_ORDER_STEP = 1000;

@Injectable()
export class OnboardingTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: OnboardingTemplateRepository,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Template CRUD
  // ──────────────────────────────────────────────────────────────────

  async list(query: ListTemplatesDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const where: Prisma.OnboardingTemplateWhereInput = {};
    if (query.q) where.name = { contains: query.q, mode: 'insensitive' };
    if (query.active === 'true') where.isActive = true;
    if (query.active === 'false') where.isActive = false;

    return this.repo.findManyByOrg(orgId, where);
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Template not found');
    return row;
  }

  async create(dto: CreateTemplateDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);
    const userId = this.ctx.requireUserId();

    const isDefault = dto.isDefault ?? false;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.onboardingTemplate.updateMany({
          where: { organizationId: orgId, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });
      }

      return tx.onboardingTemplate.create({
        data: {
          organizationId: orgId,
          name: dto.name,
          description: dto.description ?? null,
          isActive: dto.isActive ?? true,
          isDefault,
          createdById: userId,
        },
        include: {
          tasks: { orderBy: { order: 'asc' } },
          _count: { select: { tasks: true, plans: true } },
        },
      });
    });
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const existing = await this.repo.findRawByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Template not found');

    const data: Prisma.OnboardingTemplateUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true && !existing.isDefault) {
        await tx.onboardingTemplate.updateMany({
          where: {
            organizationId: orgId,
            isDefault: true,
            deletedAt: null,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }
      return tx.onboardingTemplate.update({
        where: { id },
        data,
        include: {
          tasks: { orderBy: { order: 'asc' } },
          _count: { select: { tasks: true, plans: true } },
        },
      });
    });
  }

  async archive(id: string) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const existing = await this.repo.findRawByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Template not found');

    if (!existing.isActive) return this.repo.findByIdByOrg(orgId, id);
    return this.repo.update(id, { isActive: false });
  }

  async softDelete(id: string) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const existing = await this.repo.findRawByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Template not found');

    // TODO Phase 2: reject when active plans reference this template
    // (count OnboardingPlan WHERE templateId = id AND status != ARCHIVED).
    // Phase 1 has no plan service yet — soft-delete is safe because the
    // FK still resolves (plans keep their templateNameSnapshot).
    await this.repo.softDelete(id);
    return { id, success: true as const };
  }

  // ──────────────────────────────────────────────────────────────────
  // Template tasks (nested resource)
  // ──────────────────────────────────────────────────────────────────

  async addTask(templateId: string, dto: CreateTemplateTaskDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const template = await this.repo.findRawByIdByOrg(orgId, templateId);
    if (!template) throw new NotFoundException('Template not found');

    const role = dto.defaultAssigneeRole ?? AssigneeRole.HR;
    await this.assertAssignee(orgId, role, dto.defaultAssigneeUserId ?? null);

    const nextOrder = (await this.repo.maxTaskOrder(templateId)) + TASK_ORDER_STEP;

    return this.repo.createTask({
      templateId,
      title: dto.title,
      description: dto.description ?? null,
      order: nextOrder,
      defaultAssigneeRole: role,
      defaultAssigneeUserId: dto.defaultAssigneeUserId ?? null,
      dueOffsetDays: dto.dueOffsetDays ?? 0,
    });
  }

  async updateTask(taskId: string, dto: UpdateTemplateTaskDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const task = await this.repo.findTaskById(taskId);
    if (!task) throw new NotFoundException('Template task not found');
    // Make sure the task belongs to a template owned by the caller's org.
    const template = await this.repo.findRawByIdByOrg(orgId, task.templateId);
    if (!template) throw new NotFoundException('Template task not found');

    const nextRole = dto.defaultAssigneeRole ?? task.defaultAssigneeRole;
    const nextUserId =
      dto.defaultAssigneeUserId !== undefined
        ? dto.defaultAssigneeUserId
        : task.defaultAssigneeUserId;
    await this.assertAssignee(orgId, nextRole, nextUserId ?? null);

    const data: Prisma.OnboardingTemplateTaskUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.defaultAssigneeRole !== undefined) data.defaultAssigneeRole = dto.defaultAssigneeRole;
    if (dto.defaultAssigneeUserId !== undefined) {
      data.defaultAssigneeUserId = dto.defaultAssigneeUserId;
    }
    if (dto.dueOffsetDays !== undefined) data.dueOffsetDays = dto.dueOffsetDays;

    // When role flips away from CUSTOM, clear the stale userId so we don't
    // keep a dangling pointer (service-level invariant — DB allows null).
    if (
      dto.defaultAssigneeRole !== undefined &&
      dto.defaultAssigneeRole !== AssigneeRole.CUSTOM &&
      dto.defaultAssigneeUserId === undefined
    ) {
      data.defaultAssigneeUserId = null;
    }

    return this.repo.updateTask(taskId, data);
  }

  async reorderTasks(templateId: string, dto: ReorderTemplateTasksDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const template = await this.repo.findRawByIdByOrg(orgId, templateId);
    if (!template) throw new NotFoundException('Template not found');

    const existing = await this.repo.findTasksByTemplate(templateId);
    const existingIds = new Set(existing.map((t) => t.id));

    if (dto.ids.length !== existing.length) {
      throw new BadRequestException('ids must list every task of the template exactly once');
    }
    for (const id of dto.ids) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Task ${id} does not belong to template`);
      }
    }
    if (new Set(dto.ids).size !== dto.ids.length) {
      throw new BadRequestException('ids must not contain duplicates');
    }

    await this.prisma.$transaction(
      dto.ids.map((id, idx) =>
        this.prisma.onboardingTemplateTask.update({
          where: { id },
          data: { order: idx * TASK_ORDER_STEP },
        }),
      ),
    );

    return this.repo.findTasksByTemplate(templateId);
  }

  async deleteTask(taskId: string) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const task = await this.repo.findTaskById(taskId);
    if (!task) throw new NotFoundException('Template task not found');
    const template = await this.repo.findRawByIdByOrg(orgId, task.templateId);
    if (!template) throw new NotFoundException('Template task not found');

    await this.repo.deleteTask(taskId);
    return { id: taskId, success: true as const };
  }

  // ──────────────────────────────────────────────────────────────────
  // Validation helpers
  // ──────────────────────────────────────────────────────────────────

  private async assertAssignee(
    orgId: string,
    role: AssigneeRole,
    userId: string | null,
  ): Promise<void> {
    if (role === AssigneeRole.CUSTOM) {
      if (!userId) {
        throw new BadRequestException(
          'defaultAssigneeUserId is required when defaultAssigneeRole = CUSTOM',
        );
      }
      const user = await this.prisma.user.findFirst({
        where: { id: userId, organizationId: orgId },
        select: { id: true },
      });
      if (!user) {
        throw new BadRequestException('defaultAssigneeUserId not found in organization');
      }
    }
  }
}
