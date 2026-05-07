import { Injectable } from '@nestjs/common';
import { Prisma, PreferenceScope } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class PreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOne(scope: PreferenceScope, scopeId: string, key: string) {
    return this.prisma.preference.findUnique({
      where: { scope_scopeId_key: { scope, scopeId, key } },
    });
  }

  findManyByScope(scope: PreferenceScope, scopeId: string) {
    return this.prisma.preference.findMany({
      where: { scope, scopeId },
    });
  }

  upsert(scope: PreferenceScope, scopeId: string, key: string, value: Prisma.InputJsonValue) {
    return this.prisma.preference.upsert({
      where: { scope_scopeId_key: { scope, scopeId, key } },
      create: { scope, scopeId, key, value },
      update: { value },
    });
  }

  delete(scope: PreferenceScope, scopeId: string, key: string) {
    return this.prisma.preference.delete({
      where: { scope_scopeId_key: { scope, scopeId, key } },
    });
  }
}
