import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

import { isAppAdmin } from '@/common/auth/access';
import { RequestUser } from '@/common/types';
import { OrgChartService } from '@/apps/hrm/orgchart/orgchart.service';
import { PrismaService } from '@libs/database/prisma.service';

import {
  CreateAttendanceCorrectionDto,
  DecideCorrectionDto,
  ListCorrectionsDto,
} from './dto';
import { AttendanceCorrectionRepository } from './attendance-correction.repository';

@Injectable()
export class AttendanceCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AttendanceCorrectionRepository,
    private readonly orgChart: OrgChartService,
    private readonly events: EventEmitter2,
  ) {}

  async list(currentUser: RequestUser, query: ListCorrectionsDto) {
    const orgId = this.requireOrg(currentUser);
    const isAdminOrAppAdmin = await isAppAdmin(currentUser, 'HRM', orgId, this.prisma);

    const where: Prisma.AttendanceCorrectionWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) (where.date as Prisma.DateTimeFilter).gte = new Date(query.from);
      if (query.to) (where.date as Prisma.DateTimeFilter).lte = new Date(query.to);
    }
    if (query.requesterId) where.requesterId = query.requesterId;

    if (!isAdminOrAppAdmin) {
      const employeeId = currentUser.employeeId;
      if (!employeeId) {
        throw new ForbiddenException(
          'Account is not linked to an employee — cannot view corrections',
        );
      }
      const own = { requesterId: employeeId };
      const assigned = { approverId: employeeId };
      if (query.scope === 'mine') Object.assign(where, own);
      else if (query.scope === 'incoming') Object.assign(where, assigned);
      else where.OR = [own, assigned];
    } else if (query.scope === 'mine' && currentUser.employeeId) {
      where.requesterId = currentUser.employeeId;
    } else if (query.scope === 'incoming' && currentUser.employeeId) {
      where.approverId = currentUser.employeeId;
    }

    return this.repo.findManyByOrg(orgId, where);
  }

  async findOne(currentUser: RequestUser, id: string) {
    const orgId = this.requireOrg(currentUser);
    const req = await this.repo.findByIdByOrg(orgId, id);
    if (!req) throw new NotFoundException('Attendance correction not found');
    await this.assertCanView(currentUser, orgId, req);
    return req;
  }

  async create(currentUser: RequestUser, dto: CreateAttendanceCorrectionDto) {
    const orgId = this.requireOrg(currentUser);
    const requesterId = currentUser.employeeId;
    if (!requesterId) {
      throw new ForbiddenException(
        'Account is not linked to an employee — cannot create corrections',
      );
    }

    if (!dto.requestedCheckInAt && !dto.requestedCheckOutAt) {
      throw new BadRequestException(
        'At least one of requestedCheckInAt / requestedCheckOutAt is required',
      );
    }

    const { candidates } = await this.orgChart.getApproverCandidates(currentUser, requesterId);
    if (!candidates.some((c) => c.employeeId === dto.approverId)) {
      throw new BadRequestException(
        'approverId is not in the suggested approver candidates for this employee',
      );
    }

    const dateOnly = startOfDayUtc(new Date(dto.date));

    const created = await this.repo.create({
      organizationId: orgId,
      requesterId,
      approverId: dto.approverId,
      date: dateOnly,
      requestedCheckInAt: dto.requestedCheckInAt ? new Date(dto.requestedCheckInAt) : null,
      requestedCheckOutAt: dto.requestedCheckOutAt ? new Date(dto.requestedCheckOutAt) : null,
      reason: dto.reason,
      status: 'PENDING',
    });

    this.events.emit('attendance-correction.created', { id: created.id, organizationId: orgId });
    return created;
  }

  async approve(currentUser: RequestUser, id: string, dto: DecideCorrectionDto) {
    const orgId = this.requireOrg(currentUser);
    const req = await this.repo.findByIdByOrg(orgId, id);
    if (!req) throw new NotFoundException('Attendance correction not found');
    if (req.approverId !== currentUser.employeeId) {
      throw new ForbiddenException('Only the assigned approver can decide this request');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Cannot decide a ${req.status} request`);
    }

    // Apply correction: upsert AttendanceLog row for (employeeId, date) with
    // source = CORRECTION. Wraps the status update in the same transaction
    // so a failed log write rolls back the approval.
    const updated = await this.prisma.$transaction(async (tx) => {
      const dateOnly = startOfDayUtc(req.date);
      const existing = await tx.attendanceLog.findUnique({
        where: { employeeId_date: { employeeId: req.requesterId, date: dateOnly } },
      });

      if (existing) {
        await tx.attendanceLog.update({
          where: { id: existing.id },
          data: {
            checkInAt: req.requestedCheckInAt ?? existing.checkInAt,
            checkOutAt: req.requestedCheckOutAt ?? existing.checkOutAt,
            source: 'CORRECTION',
            note: req.reason,
          },
        });
      } else {
        await tx.attendanceLog.create({
          data: {
            organizationId: orgId,
            employeeId: req.requesterId,
            date: dateOnly,
            checkInAt: req.requestedCheckInAt,
            checkOutAt: req.requestedCheckOutAt,
            source: 'CORRECTION',
            note: req.reason,
          },
        });
      }

      return tx.attendanceCorrection.update({
        where: { id },
        data: {
          status: 'APPROVED',
          decisionNote: dto.decisionNote ?? null,
          decidedAt: new Date(),
        },
        include: {
          requester: {
            select: {
              id: true,
              code: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
          approver: {
            select: {
              id: true,
              code: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    });

    this.events.emit('attendance-correction.approved', { id, organizationId: orgId });
    return updated;
  }

  async reject(currentUser: RequestUser, id: string, dto: DecideCorrectionDto) {
    if (!dto.decisionNote || dto.decisionNote.trim().length === 0) {
      throw new BadRequestException('decisionNote is required when rejecting');
    }
    const orgId = this.requireOrg(currentUser);
    const req = await this.repo.findByIdByOrg(orgId, id);
    if (!req) throw new NotFoundException('Attendance correction not found');
    if (req.approverId !== currentUser.employeeId) {
      throw new ForbiddenException('Only the assigned approver can decide this request');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Cannot decide a ${req.status} request`);
    }

    const updated = await this.repo.update(id, {
      status: 'REJECTED',
      decisionNote: dto.decisionNote,
      decidedAt: new Date(),
    });
    this.events.emit('attendance-correction.rejected', { id, organizationId: orgId });
    return updated;
  }

  async cancel(currentUser: RequestUser, id: string) {
    const orgId = this.requireOrg(currentUser);
    const req = await this.repo.findByIdByOrg(orgId, id);
    if (!req) throw new NotFoundException('Attendance correction not found');
    if (req.requesterId !== currentUser.employeeId) {
      throw new ForbiddenException('Only the requester can cancel a correction');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel a ${req.status} request`);
    }

    const updated = await this.repo.update(id, {
      status: 'CANCELLED',
      decidedAt: new Date(),
    });
    this.events.emit('attendance-correction.cancelled', { id, organizationId: orgId });
    return updated;
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

  private async assertCanView(
    currentUser: RequestUser,
    orgId: string,
    req: { requesterId: string; approverId: string | null },
  ) {
    const allowed = await isAppAdmin(currentUser, 'HRM', orgId, this.prisma);
    if (allowed) return;
    const eid = currentUser.employeeId;
    if (eid && (req.requesterId === eid || req.approverId === eid)) return;
    throw new ForbiddenException('Cannot view this correction');
  }
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
