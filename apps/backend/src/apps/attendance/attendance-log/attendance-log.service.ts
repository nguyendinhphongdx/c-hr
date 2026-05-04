import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { isAppAdmin } from '@/common/auth/access';
import { RequestUser } from '@/common/types';
import { PrismaService } from '@libs/database/prisma.service';

import { ListLogsQueryDto, UpdateAttendanceLogDto } from './dto';
import { AttendanceLogRepository } from './attendance-log.repository';

@Injectable()
export class AttendanceLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AttendanceLogRepository,
  ) {}

  async list(currentUser: RequestUser, query: ListLogsQueryDto) {
    const orgId = this.requireOrg(currentUser);
    await this.requireSelfOrHrmAppAdmin(currentUser, orgId, query.employeeId);

    const from = parseDateOnly(query.from);
    const to = parseDateOnly(query.to);
    if (from > to) {
      throw new BadRequestException('"from" must be on or before "to"');
    }
    return this.repo.findByRange(orgId, query.employeeId, from, to);
  }

  async update(
    currentUser: RequestUser,
    id: string,
    dto: UpdateAttendanceLogDto,
  ) {
    const orgId = this.requireOrg(currentUser);
    const ok = await isAppAdmin(currentUser, 'HRM', orgId, this.prisma);
    if (!ok) {
      throw new ForbiddenException('Only HRM appadmin can edit logs manually');
    }

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Log not found');

    return this.repo.update(id, {
      checkInAt: dto.checkInAt === undefined ? undefined : dto.checkInAt,
      checkOutAt: dto.checkOutAt === undefined ? undefined : dto.checkOutAt,
      note: dto.note === undefined ? undefined : dto.note,
      // Manual edits override the original source so the audit trail is
      // explicit. The audit_logs table records who/when via @Auditable.
      source: 'MANUAL_HR',
    });
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

  private async requireSelfOrHrmAppAdmin(
    user: RequestUser,
    orgId: string,
    employeeId: string,
  ) {
    if (user.employeeId === employeeId) return;
    const ok = await isAppAdmin(user, 'HRM', orgId, this.prisma);
    if (!ok) {
      throw new ForbiddenException('Can only view your own attendance logs');
    }
  }
}

function parseDateOnly(value: string): Date {
  // Strip time component — the schema column is `@db.Date`. We compare
  // against UTC midnight so timezone shifts don't bump rows out of range.
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
