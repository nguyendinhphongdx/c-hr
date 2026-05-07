import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const USER_SUMMARY = {
  select: { id: true, name: true, email: true, avatar: true },
} as const;

const ATTENDEE_INCLUDE = {
  user: USER_SUMMARY,
} as const;

const RESOURCE_INCLUDE = {
  resource: {
    select: { id: true, kind: true, name: true, color: true, location: true },
  },
} as const;

const FULL_INCLUDE = {
  owner: USER_SUMMARY,
  createdBy: USER_SUMMARY,
  attendees: { include: ATTENDEE_INCLUDE },
  resources: { include: RESOURCE_INCLUDE },
} as const;

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Range query — returns any event whose [startAt, endAt) interval
   * overlaps with [from, to). Soft-deleted rows excluded; cancelled
   * stay (FE renders strikethrough).
   */
  findRangeByOrg(organizationId: string, from: Date, to: Date, extra: Prisma.EventWhereInput = {}) {
    return this.prisma.event.findMany({
      where: {
        organizationId,
        deletedAt: null,
        startAt: { lt: to },
        endAt: { gt: from },
        ...extra,
      },
      orderBy: { startAt: 'asc' },
      include: FULL_INCLUDE,
    });
  }

  findByIdByOrg(organizationId: string, id: string) {
    return this.prisma.event.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: FULL_INCLUDE,
    });
  }

  create(data: Prisma.EventUncheckedCreateInput) {
    return this.prisma.event.create({ data, include: FULL_INCLUDE });
  }

  update(id: string, data: Prisma.EventUncheckedUpdateInput) {
    return this.prisma.event.update({
      where: { id },
      data,
      include: FULL_INCLUDE,
    });
  }

  softDelete(id: string) {
    return this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Attendee operations ──────────────────────────────────────────

  createAttendees(rows: Prisma.EventAttendeeUncheckedCreateInput[]) {
    if (rows.length === 0) return Promise.resolve({ count: 0 });
    return this.prisma.eventAttendee.createMany({ data: rows, skipDuplicates: true });
  }

  findAttendeeByUser(eventId: string, userId: string) {
    return this.prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
  }

  updateAttendee(id: string, data: Prisma.EventAttendeeUncheckedUpdateInput) {
    return this.prisma.eventAttendee.update({ where: { id }, data });
  }
}
