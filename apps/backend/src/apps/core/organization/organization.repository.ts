import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

/**
 * Plain repository for the Organization entity.
 *
 * Organization is the tenant root, so there are no `*ByOrg` methods —
 * the row IS the Org. Cross-Org queries (sysowner list / soft-delete)
 * will live in apps/platform/organization later, not here.
 *
 * Per ADR 0005 the first concrete repository goes in F1; we'll only
 * extract a generic BaseRepository<T> when Employee/Department land in
 * F2 and the actual pattern repeats.
 */
@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.organization.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.organization.findUnique({ where: { slug } });
  }

  update(id: string, data: Prisma.OrganizationUpdateInput) {
    return this.prisma.organization.update({ where: { id }, data });
  }
}
