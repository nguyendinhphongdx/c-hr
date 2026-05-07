import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { CreateResourceDto, ListResourcesDto, UpdateResourceDto } from './dto';
import { ResourceAcl } from './resource.acl';
import { ResourceRepository } from './resource.repository';

@Injectable()
export class ResourceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: ResourceRepository,
  ) {}

  async list(query: ListResourcesDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireUserId();

    const where: Prisma.ResourceWhereInput = {};
    if (query.kind) where.kind = query.kind;
    if (query.activeOnly !== false) where.isActive = true;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { location: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    return this.repo.findManyByOrg(orgId, where);
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const r = await this.repo.findByIdByOrg(orgId, id);
    if (!r) throw new NotFoundException('Resource not found');
    const acl = new ResourceAcl(r);
    await acl.require('canView');
    return { ...r, view: await acl.getAcl() };
  }

  async create(dto: CreateResourceDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    if (dto.managingDepartmentId) {
      const dept = await this.prisma.department.findFirst({
        where: {
          id: dto.managingDepartmentId,
          organizationId: orgId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!dept) throw new NotFoundException('Department not found in org');
    }

    return this.repo
      .create({
        organizationId: orgId,
        kind: dto.kind,
        name: dto.name,
        description: dto.description ?? null,
        location: dto.location ?? null,
        capacity: dto.capacity ?? null,
        color: dto.color ?? null,
        isActive: dto.isActive ?? true,
        managingDepartmentId: dto.managingDepartmentId ?? null,
      })
      .catch((err) => {
        // Unique violation (`organizationId, name`)
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          throw new ConflictException('Tên tài nguyên đã tồn tại trong Org');
        }
        throw err;
      });
  }

  async update(id: string, dto: UpdateResourceDto) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Resource not found');

    const acl = new ResourceAcl(row);
    await acl.require('canEdit');

    if (dto.managingDepartmentId) {
      const dept = await this.prisma.department.findFirst({
        where: {
          id: dto.managingDepartmentId,
          organizationId: orgId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!dept) throw new NotFoundException('Department not found in org');
    }

    const data: Prisma.ResourceUncheckedUpdateInput = {};
    if (dto.kind !== undefined) data.kind = dto.kind;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.managingDepartmentId !== undefined) {
      data.managingDepartmentId = dto.managingDepartmentId;
    }

    return this.repo.update(id, data).catch((err) => {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Tên tài nguyên đã tồn tại trong Org');
      }
      throw err;
    });
  }

  async remove(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Resource not found');

    const acl = new ResourceAcl(row);
    await acl.require('canDelete');

    // Hard-delete is blocked by FK Restrict on event_resources. Soft-
    // delete keeps history queryable while removing the row from
    // pickers (repository filters `deletedAt: null`).
    await this.repo.softDelete(id);
    return { id, success: true };
  }
}
