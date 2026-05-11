import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRole } from '@prisma/client';

import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { ProjectAcl, ProjectAclSubject } from '../project/project.acl';
import { ProjectRepository } from '../project/project.repository';

import { CreateTaskSectionDto, ReorderSectionsDto, UpdateTaskSectionDto } from './dto';
import { TaskSectionRepository } from './task-section.repository';

@Injectable()
export class TaskSectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly projectRepo: ProjectRepository,
    private readonly repo: TaskSectionRepository,
  ) {}

  async list(projectId: string) {
    await this.assertProjectViewable(projectId);
    return this.repo.findManyByProject(projectId);
  }

  async create(projectId: string, dto: CreateTaskSectionDto) {
    await this.assertProjectEditable(projectId);
    const order = (await this.repo.maxOrder(projectId)) + 1;
    return this.repo.create({ projectId, name: dto.name, order });
  }

  async update(id: string, dto: UpdateTaskSectionDto) {
    const section = await this.repo.findById(id);
    if (!section) throw new NotFoundException('Section not found');
    await this.assertProjectEditable(section.projectId);

    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
    });
  }

  async reorder(projectId: string, dto: ReorderSectionsDto) {
    await this.assertProjectEditable(projectId);

    const existing = await this.repo.findManyByProject(projectId);
    const existingIds = new Set(existing.map((s) => s.id));

    if (dto.ids.length !== existing.length) {
      throw new BadRequestException('ids must list every section of the project exactly once');
    }
    for (const id of dto.ids) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(`Section ${id} does not belong to project`);
      }
    }
    if (new Set(dto.ids).size !== dto.ids.length) {
      throw new BadRequestException('ids must not contain duplicates');
    }

    await this.prisma.$transaction(
      dto.ids.map((id, order) =>
        this.prisma.taskSection.update({ where: { id }, data: { order } }),
      ),
    );

    return this.repo.findManyByProject(projectId);
  }

  async remove(id: string) {
    const section = await this.repo.findById(id);
    if (!section) throw new NotFoundException('Section not found');
    await this.assertProjectEditable(section.projectId);

    const taskCount = await this.prisma.task.count({
      where: { sectionId: id, deletedAt: null },
    });
    if (taskCount > 0) {
      throw new BadRequestException(
        'Không xoá được cột còn task. Hãy chuyển task sang cột khác trước.',
      );
    }

    await this.repo.remove(id);
    return { id, success: true as const };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private async assertProjectViewable(projectId: string) {
    const orgId = this.ctx.requireOrg();
    const project = await this.projectRepo.findByIdByOrg(orgId, projectId);
    if (!project) throw new NotFoundException('Project not found');
    await this.buildAcl(project).require('canView');
    return project;
  }

  private async assertProjectEditable(projectId: string) {
    const orgId = this.ctx.requireOrg();
    const project = await this.projectRepo.findByIdByOrg(orgId, projectId);
    if (!project) throw new NotFoundException('Project not found');
    const acl = this.buildAcl(project);
    if (!acl.canEdit()) throw new ForbiddenException('Not allowed: canEdit');
    return project;
  }

  private buildAcl(
    project: NonNullable<Awaited<ReturnType<ProjectRepository['findByIdByOrg']>>>,
  ): ProjectAcl {
    const memberRoles = new Map<string, ProjectRole>();
    for (const m of project.members) memberRoles.set(m.userId, m.role);
    const subject: ProjectAclSubject = {
      id: project.id,
      organizationId: project.organizationId,
      ownerId: project.ownerId,
      visibility: project.visibility,
      _memberRoles: memberRoles,
    };
    return new ProjectAcl(subject);
  }
}
