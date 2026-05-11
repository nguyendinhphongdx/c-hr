import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

export const TEMPLATE_FULL_INCLUDE = {
  tasks: { orderBy: { order: 'asc' as const } },
  _count: { select: { tasks: true, plans: true } },
} satisfies Prisma.OnboardingTemplateInclude;

@Injectable()
export class OnboardingTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string, where: Prisma.OnboardingTemplateWhereInput) {
    return this.prisma.onboardingTemplate.findMany({
      where: { organizationId, deletedAt: null, ...where },
      include: TEMPLATE_FULL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.onboardingTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: TEMPLATE_FULL_INCLUDE,
    });
  }

  /** Hot-path lookup without the include payload. */
  findRawByIdByOrg(organizationId: string, id: string) {
    return this.prisma.onboardingTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }

  create(data: Prisma.OnboardingTemplateUncheckedCreateInput) {
    return this.prisma.onboardingTemplate.create({
      data,
      include: TEMPLATE_FULL_INCLUDE,
    });
  }

  update(id: string, data: Prisma.OnboardingTemplateUncheckedUpdateInput) {
    return this.prisma.onboardingTemplate.update({
      where: { id },
      data,
      include: TEMPLATE_FULL_INCLUDE,
    });
  }

  softDelete(id: string) {
    return this.prisma.onboardingTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ─── Template task helpers ────────────────────────────────────────

  findTaskById(id: string) {
    return this.prisma.onboardingTemplateTask.findUnique({ where: { id } });
  }

  createTask(data: Prisma.OnboardingTemplateTaskUncheckedCreateInput) {
    return this.prisma.onboardingTemplateTask.create({ data });
  }

  updateTask(id: string, data: Prisma.OnboardingTemplateTaskUncheckedUpdateInput) {
    return this.prisma.onboardingTemplateTask.update({ where: { id }, data });
  }

  deleteTask(id: string) {
    return this.prisma.onboardingTemplateTask.delete({ where: { id } });
  }

  findTasksByTemplate(templateId: string) {
    return this.prisma.onboardingTemplateTask.findMany({
      where: { templateId },
      orderBy: { order: 'asc' },
    });
  }

  /** Returns max(order) for the template, or -1 if empty. */
  async maxTaskOrder(templateId: string): Promise<number> {
    const row = await this.prisma.onboardingTemplateTask.findFirst({
      where: { templateId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return row?.order ?? -1;
  }
}
