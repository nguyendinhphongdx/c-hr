import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ActivityService } from '@/apps/collaboration/activity/activity.service';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import {
  CreateEventDto,
  ListEventsDto,
  RespondAttendeeDto,
  UpdateEventDto,
} from './dto';
import { EventAcl, EventAclSubject } from './event.acl';
import { EventRepository } from './event.repository';

const MAX_RANGE_DAYS = 92; // ~3 months — enough for month/quarter views

@Injectable()
export class EventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: EventRepository,
    private readonly activities: ActivityService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Range query — main "render the calendar" endpoint
  // ──────────────────────────────────────────────────────────────────
  async list(query: ListEventsDto) {
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.requireUserId();

    const from = new Date(query.from);
    const to = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (to <= from) {
      throw new BadRequestException('"to" must be after "from"');
    }
    const span = (to.getTime() - from.getTime()) / 86_400_000;
    if (span > MAX_RANGE_DAYS) {
      throw new BadRequestException(`Range too wide (max ${MAX_RANGE_DAYS} days)`);
    }

    const isHrm = this.ctx.isAppAdmin('HRM', orgId);
    const where: Prisma.EventWhereInput = {};

    if (query.scope === 'all' && isHrm) {
      // org-wide — leave where empty
    } else if (query.scope === 'invited') {
      where.attendees = { some: { userId } };
    } else if (Array.isArray(query.userIds) && query.userIds.length > 0) {
      // Explicit user list (e.g. colleague calendar). Only HRM admin can
      // peek at any user; others can only request themselves.
      const allowed = isHrm
        ? query.userIds
        : query.userIds.filter((u) => u === userId);
      where.OR = [
        { ownerId: { in: allowed } },
        { attendees: { some: { userId: { in: allowed } } } },
      ];
    } else {
      // Default "mine" — owned OR invited.
      where.OR = [
        { ownerId: userId },
        { attendees: { some: { userId } } },
      ];
    }

    const rows = await this.repo.findRangeByOrg(orgId, from, to, where);
    return rows.map((row) => this.releaseForViewer(row));
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Event not found');
    const acl = this.buildAcl(row);
    await acl.require('canView');
    return { ...this.shapeRow(row, await acl.canViewDetail()), view: await acl.getAcl() };
  }

  // ──────────────────────────────────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────────────────────────────────
  async create(dto: CreateEventDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) {
      throw new BadRequestException('"endAt" must be after "startAt"');
    }

    // Owner defaults to caller. Setting on behalf is gated to HRM admin.
    let ownerId = callerId;
    if (dto.ownerId && dto.ownerId !== callerId) {
      if (!this.ctx.isAppAdmin('HRM', orgId)) {
        throw new ForbiddenException('Only HRM admin can set event owner on behalf');
      }
      const owner = await this.prisma.user.findFirst({
        where: { id: dto.ownerId, organizationId: orgId },
        select: { id: true },
      });
      if (!owner) throw new BadRequestException('Owner not found in organization');
      ownerId = owner.id;
    }

    const attendeeRows = await this.resolveAttendees(orgId, dto.attendees);

    const created = await this.repo.create({
      organizationId: orgId,
      ownerId,
      createdById: callerId,
      title: dto.title,
      description: dto.description ?? null,
      location: dto.location ?? null,
      conferenceUrl: dto.conferenceUrl ?? null,
      isAllDay: dto.isAllDay ?? false,
      startAt,
      endAt,
      visibility: dto.visibility ?? 'DEFAULT',
      isPrivate: dto.isPrivate ?? false,
      color: dto.color ?? null,
      attendees: attendeeRows.length
        ? { create: attendeeRows }
        : undefined,
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'Event',
      objectId: created.id,
      objectLabel: created.title,
      action: 'event.created',
      userId: callerId,
    });

    return this.shapeRow(created, true);
  }

  async update(id: string, dto: UpdateEventDto) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Event not found');

    const acl = this.buildAcl(row);
    await acl.require('canEdit');

    const data: Prisma.EventUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.conferenceUrl !== undefined) data.conferenceUrl = dto.conferenceUrl;
    if (dto.isAllDay !== undefined) data.isAllDay = dto.isAllDay;
    if (dto.startAt !== undefined) data.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) data.endAt = new Date(dto.endAt);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.isPrivate !== undefined) data.isPrivate = dto.isPrivate;
    if (dto.color !== undefined) data.color = dto.color;

    // Sanity: if both endpoints supplied, end > start.
    const newStart = (data.startAt as Date | undefined) ?? row.startAt;
    const newEnd = (data.endAt as Date | undefined) ?? row.endAt;
    if (newEnd <= newStart) {
      throw new BadRequestException('"endAt" must be after "startAt"');
    }

    const updated = await this.repo.update(id, data);

    this.activities.log({
      organizationId: orgId,
      objectType: 'Event',
      objectId: updated.id,
      objectLabel: updated.title,
      action: 'event.updated',
      userId: this.ctx.userId,
    });

    return this.shapeRow(updated, true);
  }

  async cancel(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Event not found');

    const acl = this.buildAcl(row);
    await acl.require('canEdit');

    if (row.status === 'CANCELLED') {
      return this.shapeRow(row, true);
    }

    const updated = await this.repo.update(id, { status: 'CANCELLED' });
    this.activities.log({
      organizationId: orgId,
      objectType: 'Event',
      objectId: updated.id,
      objectLabel: updated.title,
      action: 'event.cancelled',
      userId: this.ctx.userId,
    });
    return this.shapeRow(updated, true);
  }

  async remove(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Event not found');

    const acl = this.buildAcl(row);
    await acl.require('canDelete');

    await this.repo.softDelete(id);
    this.activities.log({
      organizationId: orgId,
      objectType: 'Event',
      objectId: id,
      objectLabel: row.title,
      action: 'event.deleted',
      userId: this.ctx.userId,
    });
    return { id, success: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // Attendee respond
  // ──────────────────────────────────────────────────────────────────
  async respond(eventId: string, dto: RespondAttendeeDto) {
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.requireUserId();

    const row = await this.repo.findByIdByOrg(orgId, eventId);
    if (!row) throw new NotFoundException('Event not found');

    const att = await this.repo.findAttendeeByUser(eventId, userId);
    if (!att) {
      throw new ForbiddenException('You are not invited to this event');
    }

    await this.repo.updateAttendee(att.id, {
      response: dto.response,
      respondedAt: new Date(),
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'Event',
      objectId: eventId,
      objectLabel: row.title,
      action: `event.responded.${dto.response.toLowerCase()}`,
      userId,
    });

    const fresh = await this.repo.findByIdByOrg(orgId, eventId);
    return fresh ? this.shapeRow(fresh, true) : null;
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private buildAcl(
    row: Awaited<ReturnType<EventRepository['findByIdByOrg']>>,
  ): EventAcl {
    if (!row) throw new NotFoundException('Event not found');
    const subject: EventAclSubject = {
      id: row.id,
      organizationId: row.organizationId,
      ownerId: row.ownerId,
      createdById: row.createdById,
      isPrivate: row.isPrivate,
      visibility: row.visibility,
      _attendeeUserIds: row.attendees
        .map((a) => a.userId)
        .filter((u): u is string => !!u),
    };
    return new EventAcl(subject);
  }

  /** Strip private fields when the viewer can only see "busy". */
  private shapeRow(
    row: NonNullable<Awaited<ReturnType<EventRepository['findByIdByOrg']>>>,
    detail: boolean,
  ) {
    if (detail) return row;
    return {
      ...row,
      title: 'Busy',
      description: null,
      location: null,
      conferenceUrl: null,
      attendees: [],
    };
  }

  private releaseForViewer(
    row: NonNullable<Awaited<ReturnType<EventRepository['findByIdByOrg']>>>,
  ) {
    const acl = new EventAcl({
      id: row.id,
      organizationId: row.organizationId,
      ownerId: row.ownerId,
      createdById: row.createdById,
      isPrivate: row.isPrivate,
      visibility: row.visibility,
      _attendeeUserIds: row.attendees
        .map((a) => a.userId)
        .filter((u): u is string => !!u),
    });
    return this.shapeRow(row, acl.canViewDetail());
  }

  private async resolveAttendees(
    orgId: string,
    list: CreateEventDto['attendees'],
  ): Promise<Prisma.EventAttendeeUncheckedCreateInput[]> {
    if (!list || list.length === 0) return [];

    const userIds = list.map((a) => a.userId).filter((u): u is string => !!u);
    let validUserIds: Set<string> = new Set();
    if (userIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds }, organizationId: orgId },
        select: { id: true },
      });
      validUserIds = new Set(users.map((u) => u.id));
      const missing = userIds.filter((u) => !validUserIds.has(u));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Some attendees are not in the organization: ${missing.join(', ')}`,
        );
      }
    }

    const rows: Prisma.EventAttendeeUncheckedCreateInput[] = [];
    for (const a of list) {
      if (a.userId) {
        rows.push({
          eventId: '', // Prisma sets via nested .create
          userId: a.userId,
          isOptional: a.isOptional ?? false,
        });
      } else if (a.email) {
        rows.push({
          eventId: '',
          email: a.email.toLowerCase(),
          displayName: a.displayName ?? null,
          isOptional: a.isOptional ?? false,
        });
      } else {
        throw new BadRequestException('Attendee needs userId or email');
      }
    }
    // Strip the placeholder eventId — Prisma nested create will fill it.
    return rows.map(({ eventId: _ignored, ...rest }) => rest as Prisma.EventAttendeeUncheckedCreateInput);
  }
}
