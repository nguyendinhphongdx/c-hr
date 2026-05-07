import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { CreateFollowDto } from './dto';
import { FollowRepository } from './follow.repository';

@Injectable()
export class FollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: FollowRepository,
  ) {}

  /** Who I'm following. */
  async listFollowing() {
    const employeeId = this.ctx.requireEmployeeId();
    return this.repo.findFollowingByFollower(employeeId);
  }

  /** Who follows me. */
  async listFollowers() {
    const employeeId = this.ctx.requireEmployeeId();
    return this.repo.findFollowersOfFollowed(employeeId);
  }

  async create(dto: CreateFollowDto) {
    const orgId = this.ctx.requireOrg();
    const followerId = this.ctx.requireEmployeeId();

    if (dto.followedId === followerId) {
      throw new BadRequestException('Không thể tự theo dõi chính mình');
    }

    // Same-org gate — only employees in the caller's org are followable.
    const followed = await this.prisma.employee.findFirst({
      where: {
        id: dto.followedId,
        organizationId: orgId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!followed) {
      throw new NotFoundException('Nhân viên không tồn tại trong tổ chức');
    }

    // Idempotent — return existing row if already following.
    const existing = await this.repo.findByPair(followerId, dto.followedId);
    if (existing) return existing;

    return this.repo.create({
      followerId,
      followedId: dto.followedId,
    });
  }

  async remove(id: string) {
    const followerId = this.ctx.requireEmployeeId();
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException('Follow not found');
    if (row.followerId !== followerId) {
      throw new ForbiddenException('Bạn chỉ có thể bỏ theo dõi của chính mình');
    }
    await this.repo.delete(id);
    return { id, success: true as const };
  }
}
