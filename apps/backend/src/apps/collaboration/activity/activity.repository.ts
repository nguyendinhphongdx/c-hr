import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

import { ListActivitiesOptions } from './activity.types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

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
