import { Injectable } from '@nestjs/common';
import { AppCode } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class AppAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByOrg(organizationId: string, app?: AppCode) {
    return this.prisma.appAdmin.findMany({
      where: { organizationId, ...(app ? { appCode: app } : {}) },
      include: {
        user: { select: { id: true, email: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.appAdmin.findUnique({ where: { id } });
  }

  findUnique(userId: string, organizationId: string, appCode: AppCode) {
    return this.prisma.appAdmin.findUnique({
      where: { userId_organizationId_appCode: { userId, organizationId, appCode } },
      select: { id: true },
    });
  }

  create(data: {
    userId: string;
    organizationId: string;
    appCode: AppCode;
    grantedBy: string;
  }) {
    return this.prisma.appAdmin.create({ data });
  }

  delete(id: string) {
    return this.prisma.appAdmin.delete({ where: { id } });
  }
}
