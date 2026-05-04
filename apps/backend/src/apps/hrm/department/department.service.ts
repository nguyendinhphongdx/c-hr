import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { isAppAdmin } from '@/common/auth/access';
import { RequestUser } from '@/common/types';
import { PrismaService } from '@libs/database/prisma.service';

import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';
import { DepartmentRepository } from './department.repository';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: DepartmentRepository,
  ) {}

  async list(currentUser: RequestUser) {
    const orgId = this.requireOrg(currentUser);
    return this.repo.findManyByOrg(orgId);
  }

  async findOne(currentUser: RequestUser, id: string) {
    const orgId = this.requireOrg(currentUser);
    const dept = await this.repo.findByIdByOrg(orgId, id);
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async create(currentUser: RequestUser, dto: CreateDepartmentDto) {
    const orgId = this.requireOrg(currentUser);
    await this.requireHrmAppAdmin(currentUser, orgId);

    if (dto.parentId) await this.assertParentInOrg(orgId, dto.parentId);
    if (dto.managerId) await this.assertManagerInOrg(orgId, dto.managerId);

    return this.repo.create({
      organizationId: orgId,
      name: dto.name,
      code: dto.code,
      parentId: dto.parentId,
      managerId: dto.managerId,
    });
  }

  async update(currentUser: RequestUser, id: string, dto: UpdateDepartmentDto) {
    const orgId = this.requireOrg(currentUser);
    await this.requireHrmAppAdmin(currentUser, orgId);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Department not found');

    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.assertParentInOrg(orgId, dto.parentId);
      await this.assertNoCycle(id, dto.parentId);
    }
    if (dto.managerId !== undefined && dto.managerId !== null) {
      await this.assertManagerInOrg(orgId, dto.managerId);
    }

    return this.repo.update(id, {
      name: dto.name ?? undefined,
      code: dto.code ?? undefined,
      parentId: dto.parentId,
      managerId: dto.managerId,
    });
  }

  async softDelete(currentUser: RequestUser, id: string) {
    const orgId = this.requireOrg(currentUser);
    await this.requireHrmAppAdmin(currentUser, orgId);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Department not found');

    await this.repo.softDelete(id);
    return { id, success: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private requireOrg(user: RequestUser): string {
    if (!user.organizationId) {
      throw new ForbiddenException('Current user is not attached to an organization');
    }
    return user.organizationId;
  }

  private async requireHrmAppAdmin(user: RequestUser, orgId: string) {
    const ok = await isAppAdmin(user, 'HRM', orgId, this.prisma);
    if (!ok) throw new ForbiddenException('Need HRM appadmin or admin role');
  }

  private async assertParentInOrg(orgId: string, parentId: string) {
    const ok = await this.repo.existsInOrg(orgId, parentId);
    if (!ok) throw new BadRequestException('Parent department not found in organization');
  }

  private async assertManagerInOrg(orgId: string, managerId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: managerId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) {
      throw new BadRequestException('Manager employee not found in organization');
    }
  }

  /**
   * Walk the proposed parent chain upward; reject if we ever hit `id`
   * itself. Cap at 64 hops to defend against accidentally orphaned cycles
   * already in the DB.
   */
  private async assertNoCycle(id: string, parentId: string) {
    let cursor: string | null = parentId;
    for (let hop = 0; hop < 64 && cursor; hop++) {
      if (cursor === id) {
        throw new BadRequestException('parentId would create a cycle');
      }
      const next: { parentId: string | null } | null = await this.prisma.department.findUnique({
        where: { id: cursor },
        select: { parentId: true },
      });
      cursor = next?.parentId ?? null;
    }
  }
}
