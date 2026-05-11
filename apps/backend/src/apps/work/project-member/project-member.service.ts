import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectRole } from '@prisma/client';

import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { ProjectAcl, ProjectAclSubject } from '../project/project.acl';
import { ProjectRepository } from '../project/project.repository';

import { AddMemberDto, UpdateMemberRoleDto } from './dto';
import { ProjectMemberRepository } from './project-member.repository';

@Injectable()
export class ProjectMemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly projectRepo: ProjectRepository,
    private readonly repo: ProjectMemberRepository,
  ) {}

  async list(projectId: string) {
    await this.assertProjectViewable(projectId);
    return this.repo.findManyByProject(projectId);
  }

  async add(projectId: string, dto: AddMemberDto) {
    const project = await this.assertProjectManageable(projectId);

    // Validate the user belongs to the same Org. We don't leak existence
    // of cross-org users — same BadRequest as "user not found".
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, organizationId: project.organizationId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('User not in organization');

    try {
      return await this.repo.create({
        projectId,
        userId: dto.userId,
        role: (dto.role ?? 'EDITOR') as ProjectRole,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Member already exists in project');
      }
      throw err;
    }
  }

  async updateRole(projectId: string, userId: string, dto: UpdateMemberRoleDto) {
    await this.assertProjectManageable(projectId);

    const existing = await this.repo.findOne(projectId, userId);
    if (!existing) throw new NotFoundException('Member not found');

    if (existing.role === 'OWNER' && dto.role !== 'OWNER') {
      const ownerCount = await this.repo.countOwners(projectId);
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot demote the only OWNER');
      }
    }

    return this.repo.updateRole(projectId, userId, dto.role as ProjectRole);
  }

  async remove(projectId: string, userId: string) {
    await this.assertProjectManageable(projectId);

    const existing = await this.repo.findOne(projectId, userId);
    if (!existing) throw new NotFoundException('Member not found');

    if (existing.role === 'OWNER') {
      const ownerCount = await this.repo.countOwners(projectId);
      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the only OWNER — transfer ownership first');
      }
    }

    await this.repo.remove(projectId, userId);
    return { success: true as const };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private async assertProjectViewable(projectId: string) {
    const orgId = this.ctx.requireOrg();
    const project = await this.projectRepo.findByIdByOrg(orgId, projectId);
    if (!project) throw new NotFoundException('Project not found');
    const acl = this.buildAcl(project);
    await acl.require('canView');
    return project;
  }

  private async assertProjectManageable(projectId: string) {
    const orgId = this.ctx.requireOrg();
    const project = await this.projectRepo.findByIdByOrg(orgId, projectId);
    if (!project) throw new NotFoundException('Project not found');
    const acl = this.buildAcl(project);
    if (!acl.canManageMembers()) {
      throw new ForbiddenException('Not allowed: canManageMembers');
    }
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
