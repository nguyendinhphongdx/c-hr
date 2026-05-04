import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { isAppAdmin } from '@/common/auth/access';
import { RequestUser } from '@/common/types';
import { PrismaService } from '@libs/database/prisma.service';

import { CreateEmployeeDto, ListEmployeesDto, UpdateEmployeeDto } from './dto';
import { EmployeeRepository } from './employee.repository';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: EmployeeRepository,
  ) {}

  async list(currentUser: RequestUser, query: ListEmployeesDto) {
    const orgId = this.requireOrg(currentUser);
    const page = query.page ?? DEFAULT_PAGE;
    const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const filter = {
      departmentId: query.departmentId,
      status: query.status,
      q: query.q,
      skip,
      take: limit,
    };
    const [data, total] = await Promise.all([
      this.repo.findManyByOrg(orgId, filter),
      this.repo.countByOrg(orgId, filter),
    ]);
    return { data, total, page, limit };
  }

  async findOne(currentUser: RequestUser, id: string) {
    const orgId = this.requireOrg(currentUser);
    const employee = await this.repo.findByIdByOrg(orgId, id);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(currentUser: RequestUser, dto: CreateEmployeeDto) {
    const orgId = this.requireOrg(currentUser);
    await this.requireHrmAppAdmin(currentUser, orgId);

    if (dto.departmentId) await this.assertDepartmentInOrg(orgId, dto.departmentId);
    await this.assertUserAvailableForLink(orgId, dto.userId);

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          organizationId: orgId,
          code: dto.code,
          departmentId: dto.departmentId,
          title: dto.title,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        },
      });
      await tx.user.update({
        where: { id: dto.userId },
        data: { employeeId: employee.id },
      });
      return employee;
    });
  }

  async update(currentUser: RequestUser, id: string, dto: UpdateEmployeeDto) {
    const orgId = this.requireOrg(currentUser);
    await this.requireHrmAppAdmin(currentUser, orgId);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Employee not found');

    if (dto.departmentId !== undefined && dto.departmentId !== null) {
      await this.assertDepartmentInOrg(orgId, dto.departmentId);
    }

    if (dto.userId !== undefined) {
      await this.assertUserAvailableForLink(orgId, dto.userId, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: {
          departmentId: dto.departmentId,
          title: dto.title,
          hireDate:
            dto.hireDate === null ? null : dto.hireDate ? new Date(dto.hireDate) : undefined,
          terminationDate:
            dto.terminationDate === null
              ? null
              : dto.terminationDate
                ? new Date(dto.terminationDate)
                : undefined,
          status: dto.status,
        },
      });

      if (dto.userId !== undefined) {
        // Detach the old user (if any), then attach the new one.
        await tx.user.updateMany({
          where: { employeeId: id, NOT: { id: dto.userId } },
          data: { employeeId: null },
        });
        await tx.user.update({
          where: { id: dto.userId },
          data: { employeeId: id },
        });
      }
      return employee;
    });
  }

  async softDelete(currentUser: RequestUser, id: string) {
    const orgId = this.requireOrg(currentUser);
    await this.requireHrmAppAdmin(currentUser, orgId);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Employee not found');

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

  private async assertDepartmentInOrg(orgId: string, departmentId: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (!dept) {
      throw new BadRequestException('Department not found in organization');
    }
  }

  private async assertUserAvailableForLink(
    orgId: string,
    userId: string,
    currentEmployeeId?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
      select: { id: true, employeeId: true },
    });
    if (!user) {
      throw new BadRequestException('Target user not found in organization');
    }
    if (user.employeeId && user.employeeId !== currentEmployeeId) {
      throw new ConflictException('Target user is already linked to another employee');
    }
  }
}
