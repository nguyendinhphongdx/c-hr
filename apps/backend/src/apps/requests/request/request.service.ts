import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

import { RequestContextService } from '@/common/context';
import { ActivityService } from '@/apps/collaboration/activity/activity.service';
import { OrgChartService } from '@/apps/hrm/orgchart/orgchart.service';
import { PrismaService } from '@libs/database/prisma.service';

import { isFieldsSchema } from '../fields-schema.types';
import { RequestGroupService } from '../request-group/request-group.service';
import { validateRequestData } from '../request.validator';
import { getHandler } from '../side-effects';

import {
  CreateRequestDto,
  DecideRequestDto,
  ListRequestsDto,
  UpdateRequestDto,
} from './dto';
import { RequestAcl } from './request.acl';
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
    private readonly activities: ActivityService,
  ) {}

  async list(query: ListRequestsDto) {
    const orgId = this.ctx.requireOrg();
    const isHrm = this.ctx.isAppAdmin('HRM', orgId);

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
    const acl = new RequestAcl(r);
    await acl.require('canView');
    return { ...r, view: await acl.getAcl() };
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
      title: dto.title,
      data: dto.data as Prisma.InputJsonValue,
      status: 'PENDING',
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'Request',
      objectId: created.id,
      action: 'request.created',
      userId: this.ctx.userId,
      objectLabel: buildRequestLabel(created),
      metadata: { groupCode: group.code, approverId: dto.approverId },
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

  async update(id: string, dto: UpdateRequestDto) {
    const orgId = this.ctx.requireOrg();
    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Request not found');

    await new RequestAcl(existing).require('canEdit');

    const changedFields: string[] = [];
    const patch: Prisma.RequestUncheckedUpdateInput = {};

    if (dto.title !== undefined && dto.title !== existing.title) {
      patch.title = dto.title;
      changedFields.push('title');
    }

    if (dto.data !== undefined) {
      if (!isFieldsSchema(existing.group.fieldsSchema)) {
        throw new BadRequestException(
          `Group "${existing.group.code}" has invalid schema`,
        );
      }
      const validationError = validateRequestData(
        existing.group.fieldsSchema,
        dto.data,
      );
      if (validationError) throw new BadRequestException(validationError);
      patch.data = dto.data as Prisma.InputJsonValue;
      changedFields.push('data');
    }

    if (dto.approverId !== undefined && dto.approverId !== existing.approverId) {
      const { candidates } = await this.orgChart.getApproverCandidates(
        existing.requesterId,
      );
      if (!candidates.some((c) => c.employeeId === dto.approverId)) {
        throw new BadRequestException(
          'approverId is not in the suggested approver candidates',
        );
      }
      patch.approverId = dto.approverId;
      changedFields.push('approverId');
    }

    if (changedFields.length === 0) return existing;

    const updated = await this.repo.update(id, patch);

    this.activities.log({
      organizationId: orgId,
      objectType: 'Request',
      objectId: id,
      action: 'request.updated',
      userId: this.ctx.userId,
      objectLabel: buildRequestLabel(updated),
      metadata: { changedFields },
    });
    this.events.emit(`request.${existing.group.code}.updated`, {
      id,
      organizationId: orgId,
    });
    return updated;
  }

  async cancel(id: string) {
    const orgId = this.ctx.requireOrg();
    const r = await this.repo.findByIdByOrg(orgId, id);
    if (!r) throw new NotFoundException('Request not found');
    if (!new RequestAcl(r).canCancel()) {
      // Preserve the previous error split: distinguish "wrong user" vs
      // "wrong status" so the FE message stays accurate.
      if (r.requesterId !== this.ctx.employeeId) {
        throw new ForbiddenException('Only the requester can cancel');
      }
      throw new BadRequestException(`Cannot cancel a ${r.status} request`);
    }

    const updated = await this.repo.update(id, {
      status: 'CANCELLED',
      decidedAt: new Date(),
    });
    this.activities.log({
      organizationId: orgId,
      objectType: 'Request',
      objectId: id,
      action: 'request.cancelled',
      userId: this.ctx.userId,
      objectLabel: buildRequestLabel(updated),
      metadata: {},
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

    if (!new RequestAcl(r).canApprove()) {
      // Preserve the previous error split: assigned-approver gate vs
      // status gate, so the FE can surface the exact reason.
      if (r.approverId !== this.ctx.employeeId) {
        throw new ForbiddenException('Only the assigned approver can decide');
      }
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

    const userId = this.ctx.userId;
    const objectLabel = buildRequestLabel(updated);
    this.activities.log({
      organizationId: orgId,
      objectType: 'Request',
      objectId: id,
      action: next === 'APPROVED' ? 'request.approved' : 'request.rejected',
      userId,
      objectLabel,
      metadata: { decisionNote: decisionNote ?? null },
    });

    if (handler && next === 'APPROVED') {
      const data = (updated.data ?? {}) as Record<string, unknown>;
      if (r.group.code === 'checkin') {
        this.activities.log({
          organizationId: orgId,
          objectType: 'Request',
          objectId: id,
          action: 'request.side_effect.checkin_corrected',
          userId,
          objectLabel,
          metadata: {
            employeeId: r.requesterId,
            date: data.date,
            checkInAt: data.requestedCheckInAt,
          },
        });
      } else if (r.group.code === 'checkout') {
        this.activities.log({
          organizationId: orgId,
          objectType: 'Request',
          objectId: id,
          action: 'request.side_effect.checkout_corrected',
          userId,
          objectLabel,
          metadata: {
            employeeId: r.requesterId,
            date: data.date,
            checkOutAt: data.requestedCheckOutAt,
          },
        });
      }
    }

    this.events.emit(`request.${r.group.code}.${next.toLowerCase()}`, {
      id,
      organizationId: orgId,
    });
    return updated;
  }
}

type RequestForLabel = {
  title?: string | null;
  group?: { name?: string | null; code: string } | null;
  requester?: { user?: { name?: string | null } | null } | null;
};

function buildRequestLabel(r: RequestForLabel): string {
  if (r.title && r.title.trim().length > 0) return r.title;
  const groupPart = r.group?.name ?? r.group?.code ?? 'Request';
  const requesterName = r.requester?.user?.name;
  return requesterName ? `${groupPart} — ${requesterName}` : groupPart;
}
