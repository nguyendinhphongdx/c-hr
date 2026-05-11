import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Tag } from '@prisma/client';

import { ObjectLoaderRegistry } from '@/apps/collaboration/registry/object-loader.registry';
import { RequestContextService } from '@/common/context';

import { AttachTagDto, BulkSetTagsDto, CreateTagDto, ListTagsDto, UpdateTagDto } from './dto';
import { TagAcl } from './tag.acl';
import { TagRepository } from './tag.repository';

@Injectable()
export class TagService {
  constructor(
    private readonly ctx: RequestContextService,
    private readonly repo: TagRepository,
    private readonly registry: ObjectLoaderRegistry,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Tag library
  // ──────────────────────────────────────────────────────────────────

  async list(query: ListTagsDto): Promise<Tag[]> {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireUserId();

    const where: Prisma.TagWhereInput = {};
    if (query.scope === 'null') {
      where.scope = null;
    } else if (query.scope) {
      where.scope = query.scope;
    }
    if (query.q) {
      where.name = { contains: query.q, mode: 'insensitive' };
    }
    return this.repo.findManyByOrg(orgId, where);
  }

  async create(dto: CreateTagDto): Promise<Tag> {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    return this.repo
      .create({
        organizationId: orgId,
        name: dto.name,
        color: dto.color,
        scope: dto.scope ?? null,
      })
      .catch((err) => {
        // Unique violation on (organizationId, scope, name)
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictException('Tên tag đã tồn tại trong scope này');
        }
        throw err;
      });
  }

  async update(id: string, dto: UpdateTagDto): Promise<Tag> {
    const orgId = this.ctx.requireOrg();
    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Tag not found');

    await new TagAcl(existing).require('canEdit');

    const data: Prisma.TagUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.scope !== undefined) data.scope = dto.scope;

    return this.repo.update(id, data).catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Tên tag đã tồn tại trong scope này');
      }
      throw err;
    });
  }

  async softDelete(id: string): Promise<{ id: string; success: true }> {
    const orgId = this.ctx.requireOrg();
    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Tag not found');

    await new TagAcl(existing).require('canDelete');

    // Assignments are removed by FK Cascade — no extra cleanup here. Soft
    // delete keeps the row queryable for audit; library queries filter
    // `deletedAt: null`.
    await this.repo.softDelete(id);
    return { id, success: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // Assignments
  // ──────────────────────────────────────────────────────────────────

  async listForObject(objectType: string, objectId: string): Promise<Tag[]> {
    const orgId = this.ctx.requireOrg();
    await this.authorizeAssignment(objectType, objectId, 'canView');
    return this.repo.findTagsForObject(orgId, objectType, objectId);
  }

  async attach(dto: AttachTagDto) {
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.requireUserId();

    const tag = await this.repo.findByIdByOrg(orgId, dto.tagId);
    if (!tag) throw new NotFoundException('Tag not found');
    this.assertScopeMatches(tag, dto.objectType);

    await this.authorizeAssignment(dto.objectType, dto.objectId, 'canEdit');

    return this.repo
      .createAssignment({
        organizationId: orgId,
        tagId: dto.tagId,
        objectType: dto.objectType,
        objectId: dto.objectId,
        createdById: userId,
      })
      .catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          // Idempotent attach — surface the existing row instead of erroring.
          return this.repo
            .findAssignmentsForObject(orgId, dto.objectType, dto.objectId)
            .then((rows) => rows.find((r) => r.tagId === dto.tagId) ?? null)
            .then((row) => {
              if (!row) throw err;
              return row;
            });
        }
        throw err;
      });
  }

  async detach(dto: AttachTagDto) {
    const orgId = this.ctx.requireOrg();
    await this.authorizeAssignment(dto.objectType, dto.objectId, 'canEdit');
    const result = await this.repo.deleteAssignment(orgId, dto.tagId, dto.objectType, dto.objectId);
    return { success: true, removed: result.count };
  }

  async bulkSetForObject(dto: BulkSetTagsDto) {
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.requireUserId();

    await this.authorizeAssignment(dto.objectType, dto.objectId, 'canEdit');

    if (dto.tagIds.length > 0) {
      const tags = await this.repo.findManyByIdsByOrg(orgId, dto.tagIds);
      if (tags.length !== dto.tagIds.length) {
        throw new BadRequestException('Một hoặc nhiều tag không thuộc Org hoặc đã bị xoá');
      }
      for (const tag of tags) this.assertScopeMatches(tag, dto.objectType);
    }

    return this.repo.replaceAssignmentsForObject(
      orgId,
      dto.objectType,
      dto.objectId,
      dto.tagIds,
      userId,
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  /**
   * Gate the assignment side of the API on the *target* object's ACL.
   * Read-side queries pass `canView`; write-side (attach/detach/bulkSet)
   * pass `canEdit`.
   *
   * Phase 1A — only entities the central `ObjectLoaderRegistry` knows
   * about can be tagged. New objectTypes (Task, Project) plug into the
   * same registry when their modules land.
   */
  private async authorizeAssignment(
    objectType: string,
    objectId: string,
    action: 'canView' | 'canEdit',
  ): Promise<void> {
    const orgId = this.ctx.requireOrg();
    const { entry, row } = await this.registry.resolve(objectType, orgId, objectId);
    if (!entry) {
      throw new BadRequestException(`Unsupported objectType "${objectType}" for tag assignments`);
    }
    if (!row) throw new NotFoundException(`${objectType} not found`);

    if (entry.Acl) {
      const acl = new entry.Acl(row);
      await acl.require(action);
      return;
    }

    // Fallback when the registry entry has no ACL: same-org membership is
    // the minimum bar. TODO: every registered entry currently provides an
    // Acl, but keep this branch so future read-only entries (e.g. system
    // catalogs) don't crash.
    if (this.ctx.organizationId !== orgId) {
      throw new ForbiddenException(`Not allowed: ${action}`);
    }
  }

  private assertScopeMatches(tag: Tag, objectType: string): void {
    if (tag.scope && tag.scope !== objectType) {
      throw new BadRequestException(
        `Tag "${tag.name}" chỉ áp dụng cho ${tag.scope}, không phải ${objectType}`,
      );
    }
  }
}
