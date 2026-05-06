import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

import { ListCommentsOptions } from './comment.types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Injectable()
export class CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.comment.findUnique({ where: { id } });
  }

  findManyByObject(
    organizationId: string,
    objectType: string,
    objectId: string,
    opts: ListCommentsOptions = {},
  ) {
    const take = Math.min(opts.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const where: Prisma.CommentWhereInput = {
      organizationId,
      objectType,
      objectId,
    };
    if (opts.parentId === null) {
      where.parentId = null;
    } else if (typeof opts.parentId === 'string') {
      where.parentId = opts.parentId;
    }
    if (opts.includeInternal === false) {
      where.isInternal = false;
    }
    return this.prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { id: true, name: true, avatar: true, email: true } },
      },
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    });
  }

  create(data: Prisma.CommentUncheckedCreateInput) {
    return this.prisma.comment.create({ data });
  }

  update(id: string, data: Prisma.CommentUncheckedUpdateInput) {
    return this.prisma.comment.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Bulk count comments grouped by (objectType, objectId) for badge views.
   * Soft-deleted rows are excluded so the badge matches the visible thread
   * count. Returns Map keyed by `${objectType}:${objectId}`.
   */
  async countByObjects(
    organizationId: string,
    refs: Array<{ objectType: string; objectId: string }>,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (refs.length === 0) return result;

    const objectIdsByType = new Map<string, string[]>();
    for (const ref of refs) {
      const list = objectIdsByType.get(ref.objectType) ?? [];
      list.push(ref.objectId);
      objectIdsByType.set(ref.objectType, list);
      result.set(`${ref.objectType}:${ref.objectId}`, 0);
    }

    for (const [objectType, objectIds] of objectIdsByType) {
      const grouped = await this.prisma.comment.groupBy({
        by: ['objectId'],
        where: {
          organizationId,
          objectType,
          objectId: { in: objectIds },
          deletedAt: null,
        },
        _count: { _all: true },
      });
      for (const row of grouped) {
        result.set(`${objectType}:${row.objectId}`, row._count._all);
      }
    }

    return result;
  }
}
