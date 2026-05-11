import { Injectable } from '@nestjs/common';
import { Prisma, Tag, TagAssignment } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────
  // Tag library
  // ──────────────────────────────────────────────────────────────────

  findManyByOrg(organizationId: string, where: Prisma.TagWhereInput = {}): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: { ...where, organizationId, deletedAt: null },
      orderBy: [{ name: 'asc' }],
    });
  }

  findByIdByOrg(organizationId: string, id: string): Promise<Tag | null> {
    return this.prisma.tag.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }

  findManyByIdsByOrg(organizationId: string, ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.tag.findMany({
      where: {
        organizationId,
        deletedAt: null,
        id: { in: ids },
      },
    });
  }

  create(data: Prisma.TagUncheckedCreateInput): Promise<Tag> {
    return this.prisma.tag.create({ data });
  }

  update(id: string, data: Prisma.TagUncheckedUpdateInput): Promise<Tag> {
    return this.prisma.tag.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Tag> {
    return this.prisma.tag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Tag assignments
  // ──────────────────────────────────────────────────────────────────

  /** All tags currently attached to a single object. */
  findTagsForObject(organizationId: string, objectType: string, objectId: string): Promise<Tag[]> {
    return this.prisma.tag.findMany({
      where: {
        organizationId,
        deletedAt: null,
        assignments: { some: { organizationId, objectType, objectId } },
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  findAssignmentsForObject(
    organizationId: string,
    objectType: string,
    objectId: string,
  ): Promise<TagAssignment[]> {
    return this.prisma.tagAssignment.findMany({
      where: { organizationId, objectType, objectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  createAssignment(data: Prisma.TagAssignmentUncheckedCreateInput): Promise<TagAssignment> {
    return this.prisma.tagAssignment.create({ data });
  }

  deleteAssignment(organizationId: string, tagId: string, objectType: string, objectId: string) {
    return this.prisma.tagAssignment.deleteMany({
      where: { organizationId, tagId, objectType, objectId },
    });
  }

  /** Replace strategy: drop all current assignments + write the new set in
   *  a single transaction. The target object's ACL must already have been
   *  cleared by the service before this is called. */
  async replaceAssignmentsForObject(
    organizationId: string,
    objectType: string,
    objectId: string,
    tagIds: string[],
    createdById: string,
  ): Promise<TagAssignment[]> {
    return this.prisma.$transaction(async (tx) => {
      await tx.tagAssignment.deleteMany({
        where: { organizationId, objectType, objectId },
      });
      if (tagIds.length === 0) return [];
      await tx.tagAssignment.createMany({
        data: tagIds.map((tagId) => ({
          organizationId,
          tagId,
          objectType,
          objectId,
          createdById,
        })),
      });
      return tx.tagAssignment.findMany({
        where: { organizationId, objectType, objectId },
        orderBy: { createdAt: 'asc' },
      });
    });
  }
}
