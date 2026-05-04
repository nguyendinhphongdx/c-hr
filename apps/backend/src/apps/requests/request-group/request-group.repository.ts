import { Injectable } from '@nestjs/common';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class RequestGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  /// System-wide table — same row visible to every Org. Returned in
  /// stable order (active first, then code) so FE dropdowns are deterministic.
  findManyActive() {
    return this.prisma.requestGroup.findMany({
      where: { isActive: true },
      orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.requestGroup.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.requestGroup.findUnique({ where: { code } });
  }
}
