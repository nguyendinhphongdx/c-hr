import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { omit } from '@/common/utils';
import { PrismaService } from '@libs/database/prisma.service';

import { ChangePasswordDto, UpdateUserDto } from './dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return omit(user, ['password']);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Resolve everything the FE `me` query needs in one round trip:
   * the user row, their Organization (null for sysowner), and the
   * AppAdmin grants for users with role=user. Admin/sysowner inherit
   * appadmin so their list is empty by design.
   */
  async findMeWithRelations(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        appAdmins: {
          select: { appCode: true, organizationId: true, createdAt: true },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return omit(user, ['password']);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
    });
    return omit(user, ['password']);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });
    return { success: true };
  }

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return {
      data: data.map((u) => omit(u, ['password'])),
      total,
      page,
      limit,
    };
  }
}
