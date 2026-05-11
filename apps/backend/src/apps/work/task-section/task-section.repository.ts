import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class TaskSectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByProject(projectId: string) {
    return this.prisma.taskSection.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });
  }

  findById(id: string) {
    return this.prisma.taskSection.findUnique({ where: { id } });
  }

  create(data: Prisma.TaskSectionUncheckedCreateInput) {
    return this.prisma.taskSection.create({ data });
  }

  update(id: string, data: Prisma.TaskSectionUncheckedUpdateInput) {
    return this.prisma.taskSection.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.taskSection.delete({ where: { id } });
  }

  /** Returns max(order) for the project, or -1 if empty. */
  async maxOrder(projectId: string): Promise<number> {
    const row = await this.prisma.taskSection.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return row?.order ?? -1;
  }
}
