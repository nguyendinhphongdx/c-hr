import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { DepartmentAcl } from './department.acl';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';
import { DepartmentRepository } from './department.repository';

@Injectable()
export class DepartmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: DepartmentRepository,
  ) {}

  async list() {
    const orgId = this.ctx.requireOrg();
    return this.repo.findManyByOrg(orgId);
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const dept = await this.repo.findByIdByOrg(orgId, id);
    if (!dept) throw new NotFoundException('Department not found');
    const acl = new DepartmentAcl(dept);
    await acl.require('canView');
    return { ...dept, view: await acl.getAcl() };
  }

  async create(dto: CreateDepartmentDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    if (dto.parentId) await this.assertParentInOrg(orgId, dto.parentId);
    if (dto.managerId) await this.assertManagerInOrg(orgId, dto.managerId);

    return this.prisma.$transaction(async (tx) => {
      const dept = await tx.department.create({
        data: {
          organizationId: orgId,
          name: dto.name,
          code: dto.code,
          parentId: dto.parentId,
          managerId: dto.managerId,
        },
        include: {
          manager: { select: { id: true, user: { select: { id: true, name: true, email: true } } } },
        },
      });
      if (dto.managerId) {
        await this.linkManagerToDept(tx, dto.managerId, dept.id);
      }
      return dept;
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const orgId = this.ctx.requireOrg();

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Department not found');
    await new DepartmentAcl(existing).require('canEdit');

    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.assertParentInOrg(orgId, dto.parentId);
      await this.assertNoCycle(id, dto.parentId);
    }
    if (dto.managerId !== undefined && dto.managerId !== null) {
      await this.assertManagerInOrg(orgId, dto.managerId);
    }

    return this.prisma.$transaction(async (tx) => {
      const dept = await tx.department.update({
        where: { id },
        data: {
          name: dto.name ?? undefined,
          code: dto.code ?? undefined,
          parentId: dto.parentId,
          managerId: dto.managerId,
        },
        include: {
          manager: { select: { id: true, user: { select: { id: true, name: true, email: true } } } },
        },
      });
      if (dto.managerId) {
        await this.linkManagerToDept(tx, dto.managerId, id);
      }
      return dept;
    });
  }

  async softDelete(id: string) {
    const orgId = this.ctx.requireOrg();

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Department not found');
    await new DepartmentAcl(existing).require('canDelete');

    await this.repo.softDelete(id);
    return { id, success: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

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
   * If the manager has no department yet, attach them to this one — so
   * the reporting-line walker (orgchart) can reach them. We don't reassign
   * managers who already work in another department; their assignment is
   * managed via Employee admin separately.
   */
  private async linkManagerToDept(
    tx: Prisma.TransactionClient,
    employeeId: string,
    deptId: string,
  ) {
    const emp = await tx.employee.findUnique({
      where: { id: employeeId },
      select: { departmentId: true },
    });
    if (emp && emp.departmentId === null) {
      await tx.employee.update({
        where: { id: employeeId },
        data: { departmentId: deptId },
      });
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
