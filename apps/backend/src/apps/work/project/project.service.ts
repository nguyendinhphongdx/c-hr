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

import { CreateProjectDto, ListProjectsDto, TransferOwnershipDto, UpdateProjectDto } from './dto';
import { ProjectAcl, ProjectAclSubject } from './project.acl';
import { PROJECT_FULL_INCLUDE, ProjectRepository } from './project.repository';

const DEFAULT_SECTIONS = ['Cần làm', 'Đang làm', 'Hoàn thành'] as const;

type ProjectWithMembers = Prisma.ProjectGetPayload<{
  include: typeof PROJECT_FULL_INCLUDE;
}>;

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: ProjectRepository,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Reads
  // ──────────────────────────────────────────────────────────────────

  async list(query: ListProjectsDto) {
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.requireUserId();
    const isHrmAdmin = this.ctx.isAppAdmin('HRM', orgId);

    const where: Prisma.ProjectWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.q) where.name = { contains: query.q, mode: 'insensitive' };
    if (query.includeArchived !== 'true') where.archivedAt = null;

    if (!isHrmAdmin) {
      // Visibility gate — anything PUBLIC same-org, OR projects I own /
      // am a member of.
      where.OR = [{ visibility: 'PUBLIC' }, { ownerId: userId }, { members: { some: { userId } } }];
    }

    const rows = await this.repo.findManyByOrg(orgId, where);
    return rows.map((row) => this.releaseRow(row));
  }

  async findOne(idOrSlug: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.fetchByIdOrSlug(orgId, idOrSlug);
    if (!row) throw new NotFoundException('Project not found');
    const acl = this.buildAcl(row);
    await acl.require('canView');
    return { ...row, view: await acl.getAcl() };
  }

  // ──────────────────────────────────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────────────────────────────────

  async create(dto: CreateProjectDto) {
    const orgId = this.ctx.requireOrg();
    const callerUserId = this.ctx.requireUserId();

    // Owner defaults to caller. Setting on behalf gated to HRM admin.
    let ownerUserId = callerUserId;
    if (dto.ownerUserId && dto.ownerUserId !== callerUserId) {
      if (!this.ctx.isAppAdmin('HRM', orgId)) {
        throw new ForbiddenException('Only HRM admin can set project owner on behalf');
      }
      const owner = await this.prisma.user.findFirst({
        where: { id: dto.ownerUserId, organizationId: orgId },
        select: { id: true },
      });
      if (!owner) throw new BadRequestException('Owner user not found in organization');
      ownerUserId = owner.id;
    }

    const slug = dto.slug
      ? await this.assertSlugAvailable(orgId, dto.slug)
      : await this.generateSlug(orgId, dto.name);

    // Validate initial members exist + same org. De-dupe and exclude owner
    // (auto-added with role=OWNER below).
    const initial = (dto.members ?? []).filter((m) => m.userId !== ownerUserId);
    if (initial.length > 0) {
      const ids = Array.from(new Set(initial.map((m) => m.userId)));
      const found = await this.prisma.user.findMany({
        where: { id: { in: ids }, organizationId: orgId },
        select: { id: true },
      });
      const foundIds = new Set(found.map((u) => u.id));
      const missing = ids.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Some members are not in the organization: ${missing.join(', ')}`,
        );
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId: orgId,
          ownerId: ownerUserId,
          name: dto.name,
          description: dto.description ?? null,
          slug,
          visibility: dto.visibility ?? 'PRIVATE',
          color: dto.color ?? null,
          icon: dto.icon ?? null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
        select: { id: true },
      });

      // Owner = OWNER member.
      const memberRows: Prisma.ProjectMemberCreateManyInput[] = [
        { projectId: project.id, userId: ownerUserId, role: 'OWNER' },
      ];
      // Initial invitees with their roles (default EDITOR).
      const dedupe = new Map<string, ProjectRole>();
      for (const m of initial) {
        if (!dedupe.has(m.userId)) {
          dedupe.set(m.userId, (m.role ?? 'EDITOR') as ProjectRole);
        }
      }
      for (const [userId, role] of dedupe.entries()) {
        memberRows.push({ projectId: project.id, userId, role });
      }
      await tx.projectMember.createMany({ data: memberRows });

      // Default Kanban columns.
      await tx.taskSection.createMany({
        data: DEFAULT_SECTIONS.map((name, order) => ({
          projectId: project.id,
          name,
          order,
        })),
      });

      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: PROJECT_FULL_INCLUDE,
      });
    });

    return this.releaseRow(created);
  }

  async update(id: string, dto: UpdateProjectDto) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Project not found');

    const acl = this.buildAcl(row);
    await acl.require('canEdit');

    const data: Prisma.ProjectUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    const updated = await this.repo.update(id, data);
    return this.releaseRow(updated);
  }

  async archive(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Project not found');

    await this.buildAcl(row).require('canEdit');
    if (row.archivedAt) return this.releaseRow(row);

    const updated = await this.repo.update(id, { archivedAt: new Date() });
    return this.releaseRow(updated);
  }

  async unarchive(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Project not found');

    await this.buildAcl(row).require('canEdit');
    if (!row.archivedAt) return this.releaseRow(row);

    const updated = await this.repo.update(id, { archivedAt: null });
    return this.releaseRow(updated);
  }

  async softDelete(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Project not found');

    const acl = this.buildAcl(row);
    await acl.require('canDelete');

    await this.repo.softDelete(id);
    return { id, success: true as const };
  }

  async transferOwnership(id: string, dto: TransferOwnershipDto) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Project not found');

    const acl = this.buildAcl(row);
    if (!acl.canTransferOwnership()) {
      throw new ForbiddenException('Not allowed: canTransferOwnership');
    }

    if (dto.newOwnerUserId === row.ownerId) {
      return this.releaseRow(row);
    }

    // New owner must already be a member of this project — caller is
    // expected to add them first. This keeps "transfer" a deliberate,
    // visible action and avoids silently inviting users.
    const isMember = row.members.some((m) => m.userId === dto.newOwnerUserId);
    if (!isMember) {
      throw new BadRequestException('New owner must be a member of the project — add them first');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectMember.update({
        where: {
          projectId_userId: { projectId: id, userId: dto.newOwnerUserId },
        },
        data: { role: 'OWNER' },
      });

      // Demote previous owner to EDITOR (still a member, can keep editing).
      await tx.projectMember.update({
        where: {
          projectId_userId: { projectId: id, userId: row.ownerId },
        },
        data: { role: 'EDITOR' },
      });

      await tx.project.update({
        where: { id },
        data: { ownerId: dto.newOwnerUserId },
      });
    });

    const fresh = await this.repo.findByIdByOrg(orgId, id);
    return fresh ? this.releaseRow(fresh) : null;
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private async fetchByIdOrSlug(orgId: string, idOrSlug: string) {
    // UUID v4 has 36 chars w/ dashes; project slugs are 3-8 uppercase
    // alphanumeric — unambiguous either way.
    if (/^[0-9a-fA-F-]{36}$/.test(idOrSlug)) {
      const byId = await this.repo.findByIdByOrg(orgId, idOrSlug);
      if (byId) return byId;
    }
    return this.repo.findBySlugByOrg(orgId, idOrSlug.toUpperCase());
  }

  private buildAcl(row: ProjectWithMembers): ProjectAcl {
    const memberRoles = new Map<string, ProjectRole>();
    for (const m of row.members) memberRoles.set(m.userId, m.role);
    const subject: ProjectAclSubject = {
      id: row.id,
      organizationId: row.organizationId,
      ownerId: row.ownerId,
      visibility: row.visibility,
      _memberRoles: memberRoles,
    };
    return new ProjectAcl(subject);
  }

  private releaseRow(row: ProjectWithMembers) {
    // `members` already carries everything callers need; nothing to strip.
    return row;
  }

  private async assertSlugAvailable(orgId: string, slug: string): Promise<string> {
    const upper = slug.toUpperCase();
    if (await this.repo.slugExistsInOrg(orgId, upper)) {
      throw new ConflictException(`Slug "${upper}" đã được dùng trong tổ chức`);
    }
    return upper;
  }

  private async generateSlug(orgId: string, name: string): Promise<string> {
    const base = sanitizeSlug(name);
    if (base.length >= 3 && !(await this.repo.slugExistsInOrg(orgId, base))) {
      return base;
    }

    // Try base + numeric suffix up to 8 chars total. Random fallback when
    // the deterministic path runs out of room.
    for (let i = 1; i < 100; i++) {
      const suffix = String(i);
      const trimmedBase = base.slice(0, Math.max(2, 8 - suffix.length));
      const candidate = (trimmedBase + suffix).slice(0, 8);
      if (candidate.length < 3) continue;
      if (!(await this.repo.slugExistsInOrg(orgId, candidate))) return candidate;
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = randomSlug(6);
      if (!(await this.repo.slugExistsInOrg(orgId, candidate))) return candidate;
    }
    throw new ConflictException('Could not generate a unique slug; please pass one');
  }
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomSlug(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Strip diacritics, force uppercase, drop non-alnum, clamp to 8 chars.
 * Pads with "X" if the result is shorter than 3 chars.
 */
function sanitizeSlug(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  let result = normalized.slice(0, 8);
  while (result.length < 3) result += 'X';
  return result;
}
