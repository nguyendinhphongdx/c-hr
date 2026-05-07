import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PreferenceScope, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { RequestContextService } from '@/common/context';
import { omit } from '@/common/utils';
import { PrismaService } from '@libs/database/prisma.service';

import { ChangePasswordDto, ListUsersDto, UpdateUserDto } from './dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
  ) {}

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
   * the user row, their Organization (null for sysowner), the AppAdmin
   * grants, and the user-scope preferences map (so calendar/etc. don't
   * need a separate round trip on app load).
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

    // Bulk preferences for this user — direct Prisma read (cheaper than
    // going through PreferenceService for a pure read; defaults are
    // applied client-side via the registry).
    const prefRows = await this.prisma.preference.findMany({
      where: { scope: PreferenceScope.USER, scopeId: userId },
      select: { key: true, value: true },
    });
    const preferences = Object.fromEntries(
      prefRows.map((r) => [r.key, (r.value as { value: unknown } | null)?.value]),
    );
    return { ...omit(user, ['password']), preferences };
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

  /**
   * Tenant-scoped list used by org-wide pickers (Employee form, Event
   * attendee picker, Calendar follow picker, …). Returns only id / email /
   * name / employeeId — same-org members need to address each other to
   * invite, follow, or assign work, so this stays open to any logged-in
   * user in the Org. Tenant scope is the security boundary; sensitive
   * fields (password hash, audit, etc.) never appear in the projection.
   */
  async listForOrg(query: ListUsersDto) {
    const orgId = this.ctx.organizationId;
    if (!orgId) {
      throw new ForbiddenException('Current user is not attached to an organization');
    }

    const limit = query.limit ?? 200;
    const where: Prisma.UserWhereInput = { organizationId: orgId };

    if (query.q) {
      const term = query.q.trim();
      if (term.length > 0) {
        where.OR = [
          { email: { contains: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    const rows = await this.prisma.user.findMany({
      where,
      take: limit,
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        email: true,
        name: true,
        employeeId: true,
      },
    });
    return rows;
  }
}
