import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { CreateEmployeeDto, ListEmployeesDto, UpdateEmployeeDto } from './dto';
import { EmployeeAcl } from './employee.acl';
import { EmployeeRepository } from './employee.repository';

const PASSWORD_BCRYPT_ROUNDS = 10;

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: EmployeeRepository,
  ) {}

  /**
   * Claim every orphan AttendanceLog (employeeId=null + employeeCode=code)
   * for this Org and link them to the new Employee. Multiple orphan rows on
   * the same date get merged into a single (employeeId, date) row with
   * MIN/MAX check-in/out — the rest are deleted to satisfy the
   * @@unique([employeeId, date]) constraint. Idempotent: re-running yields 0.
   */
  private async linkPendingAttendance(
    tx: PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    orgId: string,
    employeeId: string,
    code: string,
  ): Promise<number> {
    const orphans = await tx.attendanceLog.findMany({
      where: {
        organizationId: orgId,
        employeeId: null,
        employeeCode: code,
      },
      orderBy: [{ date: 'asc' }, { checkInAt: 'asc' }],
    });
    if (orphans.length === 0) return 0;

    // Group by date string to merge same-day rows.
    const byDate = new Map<string, typeof orphans>();
    for (const row of orphans) {
      const key = row.date.toISOString();
      const arr = byDate.get(key) ?? [];
      arr.push(row);
      byDate.set(key, arr);
    }

    for (const group of byDate.values()) {
      const checkIns = group.map((r) => r.checkInAt).filter(Boolean) as Date[];
      const checkOuts = group.map((r) => r.checkOutAt).filter(Boolean) as Date[];
      const checkInAt = checkIns.length
        ? new Date(Math.min(...checkIns.map((d) => d.getTime())))
        : null;
      const checkOutAt = checkOuts.length
        ? new Date(Math.max(...checkOuts.map((d) => d.getTime())))
        : null;

      const [first, ...rest] = group;
      await tx.attendanceLog.update({
        where: { id: first.id },
        data: { employeeId, checkInAt, checkOutAt },
      });
      if (rest.length > 0) {
        await tx.attendanceLog.deleteMany({
          where: { id: { in: rest.map((r) => r.id) } },
        });
      }
    }

    this.logger.log(
      `[employee=${employeeId}] linked ${orphans.length} orphan attendance event(s) (code=${code})`,
    );
    return orphans.length;
  }

  async list(query: ListEmployeesDto) {
    const orgId = this.ctx.requireOrg();
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

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const employee = await this.repo.findByIdByOrg(orgId, id);
    if (!employee) throw new NotFoundException('Employee not found');
    const acl = new EmployeeAcl(employee);
    await acl.require('canView');
    return { ...employee, view: await acl.getAcl() };
  }

  async create(dto: CreateEmployeeDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    if (dto.departmentId) await this.assertDepartmentInOrg(orgId, dto.departmentId);

    // Link-existing-user path: skip user creation, just attach.
    if (dto.userId) {
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
        await this.linkPendingAttendance(tx, orgId, employee.id, dto.code);
        return employee;
      });
    }

    // class-validator already rejects this branch when these are missing,
    // but TypeScript doesn't know — narrow explicitly.
    if (!dto.email || !dto.name || !dto.password) {
      throw new BadRequestException(
        'email, name and password are required when not linking an existing user',
      );
    }

    // User.email is globally unique. Catching here gives a clearer 409 than
    // letting the Prisma constraint blow up.
    const emailTaken = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (emailTaken) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_BCRYPT_ROUNDS);
    const { email, name } = dto;

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
      await tx.user.create({
        data: {
          email,
          name,
          password: passwordHash,
          role: 'user',
          organizationId: orgId,
          employeeId: employee.id,
        },
      });
      await this.linkPendingAttendance(tx, orgId, employee.id, dto.code);
      return employee;
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const orgId = this.ctx.requireOrg();

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Employee not found');
    await new EmployeeAcl(existing).require('canEdit');

    if (dto.departmentId !== undefined && dto.departmentId !== null) {
      await this.assertDepartmentInOrg(orgId, dto.departmentId);
    }

    if (dto.userId !== undefined) {
      await this.assertUserAvailableForLink(orgId, dto.userId, id);
    }

    // Code uniqueness within Org. The schema has @@unique([orgId, code])
    // so the DB will throw too — this gives a clearer 409 message.
    if (dto.code !== undefined && dto.code !== existing.code) {
      const codeTaken = await this.prisma.employee.findFirst({
        where: {
          organizationId: orgId,
          code: dto.code,
          deletedAt: null,
          NOT: { id },
        },
        select: { id: true },
      });
      if (codeTaken) {
        throw new ConflictException('Employee code already in use');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const employee = await tx.employee.update({
        where: { id },
        data: {
          code: dto.code,
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
          // F9 salary/BHXH fields. Optional + nullable — pass through as-is.
          baseSalary: dto.baseSalary === undefined ? undefined : dto.baseSalary,
          dependents: dto.dependents,
          region: dto.region,
          taxCode: dto.taxCode,
          bhxhCode: dto.bhxhCode,
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
      // If the code changed (or was just set), retry orphan reconcile —
      // pending attendance events keyed by the new code claim this row.
      if (dto.code !== undefined && dto.code !== existing.code) {
        await this.linkPendingAttendance(tx, orgId, id, dto.code);
      }
      return employee;
    });
  }

  async softDelete(id: string) {
    const orgId = this.ctx.requireOrg();

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Employee not found');
    await new EmployeeAcl(existing).require('canDelete');

    await this.repo.softDelete(id);
    return { id, success: true };
  }

  /**
   * Change the linked User's role. Gated by `canEdit` (HRM appadmin and
   * above). The employee must already be linked to a User — there's no
   * role to change otherwise.
   *
   * Refuses to demote the last sysowner so the Org cannot lock itself out.
   */
  async updateRole(id: string, role: Role) {
    const orgId = this.ctx.requireOrg();

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Employee not found');
    await new EmployeeAcl(existing).require('canEdit');

    const linkedUser = await this.prisma.user.findFirst({
      where: { employeeId: id },
      select: { id: true, role: true },
    });
    if (!linkedUser) {
      throw new BadRequestException('Employee is not linked to a User');
    }
    if (linkedUser.role === role) return { id, role };

    if (linkedUser.role === 'sysowner' && role !== 'sysowner') {
      const sysOwnerCount = await this.prisma.user.count({
        where: { organizationId: orgId, role: 'sysowner' },
      });
      if (sysOwnerCount <= 1) {
        throw new ForbiddenException('Không thể hạ cấp sysowner cuối cùng của Org.');
      }
    }

    await this.prisma.user.update({
      where: { id: linkedUser.id },
      data: { role },
    });
    return { id, role };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

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
