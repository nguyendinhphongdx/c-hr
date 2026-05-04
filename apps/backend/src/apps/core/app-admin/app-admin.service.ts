import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { AppAdminRepository } from './app-admin.repository';
import { GrantAppAdminDto } from './dto';

@Injectable()
export class AppAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: AppAdminRepository,
  ) {}

  async list(app?: GrantAppAdminDto['appCode']) {
    const orgId = this.ctx.organizationId;
    if (!orgId) {
      throw new NotFoundException('Current user is not attached to an organization');
    }
    if (!this.ctx.isAdmin(orgId)) {
      throw new ForbiddenException('Only admin role can list app admins');
    }
    return this.repo.findManyByOrg(orgId, app);
  }

  async grant(dto: GrantAppAdminDto) {
    const orgId = this.ctx.organizationId;
    if (!orgId) {
      throw new NotFoundException('Current user is not attached to an organization');
    }
    if (!this.ctx.isAdmin(orgId)) {
      throw new ForbiddenException('Only admin role can grant app admin');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true, role: true, organizationId: true },
    });
    if (!target) throw new NotFoundException('Target user not found');
    if (target.organizationId !== orgId) {
      throw new BadRequestException('Target user belongs to a different organization');
    }
    if (target.role !== 'user') {
      throw new BadRequestException('Target user already inherits app admin (role admin/sysowner)');
    }

    const existing = await this.repo.findUnique(dto.userId, orgId, dto.appCode);
    if (existing) throw new ConflictException('App admin grant already exists');

    return this.repo.create({
      userId: dto.userId,
      organizationId: orgId,
      appCode: dto.appCode,
      grantedBy: this.ctx.requireUserId(),
    });
  }

  async revoke(id: string) {
    const record = await this.repo.findById(id);
    if (!record) throw new NotFoundException('App admin grant not found');

    if (!this.ctx.isAdmin(record.organizationId)) {
      throw new ForbiddenException('Only admin role can revoke app admin');
    }

    await this.repo.delete(id);
    return { id, success: true };
  }
}
