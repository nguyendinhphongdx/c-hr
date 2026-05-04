import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { isAdmin } from '@/common/auth/access';
import { RequestUser } from '@/common/types';
import { PrismaService } from '@libs/database/prisma.service';

import { AppAdminRepository } from './app-admin.repository';
import { GrantAppAdminDto } from './dto';

@Injectable()
export class AppAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AppAdminRepository,
  ) {}

  async list(currentUser: RequestUser, app?: GrantAppAdminDto['appCode']) {
    if (!currentUser.organizationId) {
      throw new NotFoundException('Current user is not attached to an organization');
    }
    if (!isAdmin(currentUser, currentUser.organizationId)) {
      throw new ForbiddenException('Only admin role can list app admins');
    }
    return this.repo.findManyByOrg(currentUser.organizationId, app);
  }

  async grant(currentUser: RequestUser, dto: GrantAppAdminDto) {
    if (!currentUser.organizationId) {
      throw new NotFoundException('Current user is not attached to an organization');
    }
    if (!isAdmin(currentUser, currentUser.organizationId)) {
      throw new ForbiddenException('Only admin role can grant app admin');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true, organizationId: true },
    });
    if (!target) throw new NotFoundException('Target user not found');
    if (target.organizationId !== currentUser.organizationId) {
      throw new BadRequestException('Target user belongs to a different organization');
    }
    if (target.role !== 'user') {
      throw new BadRequestException('Target user already inherits app admin (role admin/sysowner)');
    }

    const existing = await this.repo.findUnique(
      dto.userId,
      currentUser.organizationId,
      dto.appCode,
    );
    if (existing) throw new ConflictException('App admin grant already exists');

    return this.repo.create({
      userId: dto.userId,
      organizationId: currentUser.organizationId,
      appCode: dto.appCode,
      grantedBy: currentUser.id,
    });
  }

  async revoke(currentUser: RequestUser, id: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('App admin grant not found');

    if (!isAdmin(currentUser, record.organizationId)) {
      throw new ForbiddenException('Only admin role can revoke app admin');
    }

    await this.repo.delete(id);
    return { id, success: true };
  }
}
