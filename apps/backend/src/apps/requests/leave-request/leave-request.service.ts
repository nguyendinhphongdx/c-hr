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
  CreateLeaveRequestDto,
  DecideLeaveRequestDto,
  ListLeaveRequestsDto,
} from './dto';
import { LeaveRequestRepository } from './leave-request.repository';

@Injectable()
export class LeaveRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: LeaveRequestRepository,
    private readonly orgChart: OrgChartService,
    private readonly events: EventEmitter2,
  ) {}

  async list(currentUser: RequestUser, query: ListLeaveRequestsDto) {
    const orgId = this.requireOrg(currentUser);
    const isAdminOrAppAdmin = await isAppAdmin(currentUser, 'HRM', orgId, this.prisma);

    const where: Prisma.LeaveRequestWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.startDate = {};
      if (query.from) (where.startDate as Prisma.DateTimeFilter).gte = new Date(query.from);
      if (query.to) (where.startDate as Prisma.DateTimeFilter).lte = new Date(query.to);
    }
    if (query.requesterId) where.requesterId = query.requesterId;

    // Visibility:
    //  - HRM appadmin / admin Org / sysowner: see all in Org (unless scope filters narrow it).
    //  - Everyone else: only own + assigned-to-approve.
    if (!isAdminOrAppAdmin) {
      const employeeId = currentUser.employeeId;
      if (!employeeId) {
        throw new ForbiddenException(
          'Account is not linked to an employee — cannot view leave requests',
        );
      }
      const ownClause = { requesterId: employeeId };
      const assignedClause = { approverId: employeeId };
      if (query.scope === 'mine') Object.assign(where, ownClause);
      else if (query.scope === 'incoming') Object.assign(where, assignedClause);
      else where.OR = [ownClause, assignedClause];
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
    if (!req) throw new NotFoundException('Leave request not found');
    await this.assertCanView(currentUser, orgId, req);
    return req;
  }

  async create(currentUser: RequestUser, dto: CreateLeaveRequestDto) {
    const orgId = this.requireOrg(currentUser);
    const requesterId = currentUser.employeeId;
    if (!requesterId) {
      throw new ForbiddenException(
        'Account is not linked to an employee — cannot create leave requests',
      );
    }

    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be on or after startDate');
    }

    // Validate approver is in the candidates list — keeps Org owners from
    // routing leave to arbitrary employees outside their reporting line.
    const { candidates } = await this.orgChart.getApproverCandidates(currentUser, requesterId);
    const valid = candidates.some((c) => c.employeeId === dto.approverId);
    if (!valid) {
      throw new BadRequestException(
        'approverId is not in the suggested approver candidates for this employee',
      );
    }

    const created = await this.repo.create({
      organizationId: orgId,
      requesterId,
      approverId: dto.approverId,
      type: dto.type,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      reason: dto.reason,
      status: 'PENDING',
    });

    this.events.emit('leave-request.created', { id: created.id, organizationId: orgId });
    return created;
  }

  async approve(currentUser: RequestUser, id: string, dto: DecideLeaveRequestDto) {
    return this.decide(currentUser, id, 'APPROVED', dto.decisionNote);
  }

  async reject(currentUser: RequestUser, id: string, dto: DecideLeaveRequestDto) {
    if (!dto.decisionNote || dto.decisionNote.trim().length === 0) {
      throw new BadRequestException('decisionNote is required when rejecting');
    }
    return this.decide(currentUser, id, 'REJECTED', dto.decisionNote);
  }

  async cancel(currentUser: RequestUser, id: string) {
    const orgId = this.requireOrg(currentUser);
    const req = await this.repo.findByIdByOrg(orgId, id);
    if (!req) throw new NotFoundException('Leave request not found');
    if (req.requesterId !== currentUser.employeeId) {
      throw new ForbiddenException('Only the requester can cancel a leave request');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel a ${req.status} request`);
    }

    const updated = await this.repo.update(id, {
      status: 'CANCELLED',
      decidedAt: new Date(),
    });
    this.events.emit('leave-request.cancelled', { id, organizationId: orgId });
    return updated;
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private async decide(
    currentUser: RequestUser,
    id: string,
    next: 'APPROVED' | 'REJECTED',
    decisionNote: string | undefined,
  ) {
    const orgId = this.requireOrg(currentUser);
    const req = await this.repo.findByIdByOrg(orgId, id);
    if (!req) throw new NotFoundException('Leave request not found');

    // Authorisation: only the assigned approver can decide. HRM appadmins
    // and Org admins do not auto-approve other people's reports — they have
    // to be the explicit approver. (Avoids surprise "admin approved my
    // leave even though I picked manager X".)
    if (req.approverId !== currentUser.employeeId) {
      throw new ForbiddenException('Only the assigned approver can decide this request');
    }
    if (req.status !== 'PENDING') {
      throw new BadRequestException(`Cannot decide a ${req.status} request`);
    }

    const updated = await this.repo.update(id, {
      status: next,
      decisionNote: decisionNote ?? null,
      decidedAt: new Date(),
    });
    this.events.emit(`leave-request.${next.toLowerCase()}`, { id, organizationId: orgId });
    return updated;
  }

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
    throw new ForbiddenException('Cannot view this leave request');
  }
}
