import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { RequestContextService } from '@/common/context';
import { omit } from '@/common/utils';
import { PrismaService } from '@libs/database/prisma.service';

import { AuthService } from '../auth/auth.service';
import { SignupDto, UpdateOrganizationDto } from './dto';
import { OrganizationRepository } from './organization.repository';

const SALT_ROUNDS = 10;

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly auth: AuthService,
    private readonly orgRepo: OrganizationRepository,
  ) {}

  /**
   * Public Org signup — creates the Organization + the first admin User
   * in a single transaction, then mints auth tokens for that user.
   *
   * Admin role automatically inherits appadmin for every app in the Org
   * (ADR 0003), so no AppAdmin record is needed for the founder.
   */
  async signup(dto: SignupDto) {
    const slugTaken = await this.orgRepo.findBySlug(dto.slug);
    if (slugTaken) throw new ConflictException('Organization slug already taken');

    const emailTaken = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
      select: { id: true },
    });
    if (emailTaken) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.adminPassword, SALT_ROUNDS);

    const { user, organization } = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: dto.organizationName, slug: dto.slug },
      });
      const user = await tx.user.create({
        data: {
          email: dto.adminEmail,
          password: passwordHash,
          name: dto.adminName,
          role: 'admin',
          organizationId: organization.id,
        },
      });
      return { user, organization };
    });

    const tokens = await this.auth.issueTokens(user);
    return {
      user: omit(user, ['password']),
      organization,
      ...tokens,
    };
  }

  async findMine() {
    const organizationId = this.ctx.organizationId;
    if (!organizationId) {
      throw new NotFoundException('Current user is not attached to an organization');
    }
    const org = await this.orgRepo.findById(organizationId);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateMine(dto: UpdateOrganizationDto) {
    const orgId = this.ctx.organizationId;
    if (!orgId) {
      throw new NotFoundException('Current user is not attached to an organization');
    }
    if (!this.ctx.isAdmin(orgId)) {
      throw new ForbiddenException('Only admin role can update organization');
    }
    return this.orgRepo.update(orgId, dto);
  }
}
