import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

import { ListActivitiesOptions } from './activity.types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** Eager-load the actor so the FE doesn't fall back to a generic
 *  "Người dùng" placeholder. Same select shape as comment repo. */
const ACTOR_INCLUDE = {
  user: { select: { id: true, name: true, avatar: true, email: true } },
} as const;

@Injectable()
export class ActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByObjectByOrg(
    organizationId: string,
    objectType: string,
    objectId: string,
    opts: ListActivitiesOptions = {},
  ) {
    const take = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.prisma.activity.findMany({
      where: { organizationId, objectType, objectId },
      orderBy: { createdAt: 'desc' },
      take,
      include: ACTOR_INCLUDE,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
  }

  create(data: Prisma.ActivityUncheckedCreateInput) {
    return this.prisma.activity.create({ data });
  }

  createMany(data: Prisma.ActivityUncheckedCreateInput[]) {
    return this.prisma.activity.createMany({ data });
  }
}
