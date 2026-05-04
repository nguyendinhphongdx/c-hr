import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

import { isAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { OrgChartService } from '@/apps/hrm/orgchart/orgchart.service';
import { PrismaService } from '@libs/database/prisma.service';

import { isFieldsSchema } from '../fields-schema.types';
import { RequestGroupService } from '../request-group/request-group.service';
import { validateRequestData } from '../request.validator';
import { getHandler } from '../side-effects';

import { CreateRequestDto, DecideRequestDto, ListRequestsDto } from './dto';
import { RequestRepository } from './request.repository';

@Injectable()
export class RequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: RequestRepository,
    private readonly groups: RequestGroupService,
    private readonly orgChart: OrgChartService,
    private readonly events: EventEmitter2,
  ) {}

  async list(query: ListRequestsDto) {
    const orgId = this.ctx.requireOrg();
    const isHrm = await isAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const where: Prisma.RequestWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.groupId) where.groupId = query.groupId;
    if (query.requesterId) where.requesterId = query.requesterId;

    if (!isHrm) {
      const eid = this.ctx.employeeId;
      if (!eid) {
        throw new ForbiddenException(
          'Account is not linked to an employee — cannot view requests',
        );
      }
      const own = { requesterId: eid };
      const assigned = { approverId: eid };
      if (query.scope === 'mine') Object.assign(where, own);
      else if (query.scope === 'incoming') Object.assign(where, assigned);
      else where.OR = [own, assigned];
    } else if (query.scope === 'mine' && this.ctx.employeeId) {
      where.requesterId = this.ctx.employeeId;
    } else if (query.scope === 'incoming' && this.ctx.employeeId) {
      where.approverId = this.ctx.employeeId;
    }

    return this.repo.findManyByOrg(orgId, where);
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const r = await this.repo.findByIdByOrg(orgId, id);
    if (!r) throw new NotFoundException('Request not found');
    await this.assertCanView(orgId, r);
    return r;
  }

  async create(dto: CreateRequestDto) {
    const orgId = this.ctx.requireOrg();
    const requesterId = this.ctx.employeeId;
    if (!requesterId) {
      throw new ForbiddenException(
        'Account is not linked to an employee — cannot create requests',
      );
    }

    const group = await this.groups.findById(dto.groupId);
    if (!group.isActive) {
      throw new BadRequestException(`Group "${group.code}" is inactive`);
    }

    if (!isFieldsSchema(group.fieldsSchema)) {
      throw new BadRequestException(`Group "${group.code}" has invalid schema`);
    }
    const validationError = validateRequestData(group.fieldsSchema, dto.data);
    if (validationError) {
      throw new BadRequestException(validationError);
    }

    // Approver must be in candidates list — same gate as F4.
    const { candidates } = await this.orgChart.getApproverCandidates(requesterId);
    if (!candidates.some((c) => c.employeeId === dto.approverId)) {
      throw new BadRequestException(
        'approverId is not in the suggested approver candidates',
      );
    }

    const created = await this.repo.create({
      organizationId: orgId,
      groupId: dto.groupId,
      requesterId,
      approverId: dto.approverId,
      data: dto.data as Prisma.InputJsonValue,
      status: 'PENDING',
    });

    this.events.emit(`request.${group.code}.created`, {
      id: created.id,
      organizationId: orgId,
    });
    return created;
  }

  async approve(id: string, dto: DecideRequestDto) {
    return this.decide(id, 'APPROVED', dto.decisionNote);
  }

  async reject(id: string, dto: DecideRequestDto) {
    if (!dto.decisionNote || dto.decisionNote.trim().length === 0) {
      throw new BadRequestException('decisionNote is required when rejecting');
    }
    return this.decide(id, 'REJECTED', dto.decisionNote);
  }

  async cancel(id: string) {
    const orgId = this.ctx.requireOrg();
    const r = await this.repo.findByIdByOrg(orgId, id);
    if (!r) throw new NotFoundException('Request not found');
    if (r.requesterId !== this.ctx.employeeId) {
      throw new ForbiddenException('Only the requester can cancel');
    }
    if (r.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel a ${r.status} request`);
    }

    const updated = await this.repo.update(id, {
      status: 'CANCELLED',
      decidedAt: new Date(),
    });
    this.events.emit(`request.${r.group.code}.cancelled`, {
      id,
      organizationId: orgId,
    });
    return updated;
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private async decide(
    id: string,
    next: 'APPROVED' | 'REJECTED',
    decisionNote: string | undefined,
  ) {
    const orgId = this.ctx.requireOrg();
    const r = await this.repo.findByIdByOrg(orgId, id);
    if (!r) throw new NotFoundException('Request not found');

    if (r.approverId !== this.ctx.employeeId) {
      throw new ForbiddenException('Only the assigned approver can decide');
    }
    if (r.status !== 'PENDING') {
      throw new BadRequestException(`Cannot decide a ${r.status} request`);
    }

    // On approve, run side-effect handler (if any) inside the same tx so
    // a thrown error rolls back the status update too.
    const handler = next === 'APPROVED' ? getHandler(r.group.code) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (handler) {
        // Re-fetch the row inside the tx to satisfy the handler signature.
        const fresh = await tx.request.findUnique({ where: { id } });
        if (!fresh) throw new NotFoundException('Request disappeared mid-tx');
        await handler(fresh, tx);
      }
      return tx.request.update({
        where: { id },
        data: {
          status: next,
          decisionNote: decisionNote ?? null,
          decidedAt: new Date(),
        },
        include: {
          group: true,
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

    this.events.emit(`request.${r.group.code}.${next.toLowerCase()}`, {
      id,
      organizationId: orgId,
    });
    return updated;
  }

  private async assertCanView(
    orgId: string,
    r: { requesterId: string; approverId: string | null },
  ) {
    const allowed = await isAppAdmin(this.ctx, 'HRM', orgId, this.prisma);
    if (allowed) return;
    const eid = this.ctx.employeeId;
    if (eid && (r.requesterId === eid || r.approverId === eid)) return;
    throw new ForbiddenException('Cannot view this request');
  }
}
