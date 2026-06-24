import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Invitation, InvitationKind, InvitationStatus, Role, SsoProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { PrismaService } from '@libs/database/prisma.service';
import { RequestContextService } from '@/common/context';

import { AuthService } from '../auth/auth.service';
import { InvitationRepository } from './invitation.repository';

const SALT_ROUNDS = 10;
const TOKEN_TTL_DAYS = 7;
const SSO_PLACEHOLDER_PREFIX = 'sso:';

export interface PublicInvitationView {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  email: string;
  name: string | null;
  message: string | null;
  invitedRole: Role;
  status: InvitationStatus;
  expiresAt: Date | null;
}

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: InvitationRepository,
    private readonly ctx: RequestContextService,
    private readonly auth: AuthService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // ADMIN — push invitations
  // ──────────────────────────────────────────────────────────────────

  async createAdminInvite(input: {
    email: string;
    name?: string;
    message?: string;
    role?: Role;
  }): Promise<Invitation> {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAdmin(orgId);
    const userId = this.ctx.requireUserId();
    const callerRole = this.ctx.role;
    const normalizedEmail = input.email.trim().toLowerCase();
    const invitedRole = input.role ?? Role.user;

    // Authority check: admin can grant admin/user (within their Org);
    // sysowner can grant anything. Block invites granting sysowner
    // from an Org-scoped admin — that would be a privilege escalation.
    if (invitedRole === Role.sysowner && callerRole !== Role.sysowner) {
      throw new BadRequestException(
        'Chỉ sysowner mới mời được sysowner. Chọn Admin hoặc Thành viên.',
      );
    }

    // Refuse when an active User already exists in this Org for the
    // same email — admin should be using /employees to manage them.
    const existing = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, organizationId: orgId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Email này đã có trong tổ chức — không cần mời lại');
    }

    // Also dedupe pending ADMIN_INVITE for the same email + Org.
    const existingInvite = await this.prisma.invitation.findFirst({
      where: {
        organizationId: orgId,
        email: normalizedEmail,
        kind: InvitationKind.ADMIN_INVITE,
        status: InvitationStatus.PENDING,
      },
      select: { id: true },
    });
    if (existingInvite) {
      throw new ConflictException(
        'Đã có lời mời PENDING cho email này — hãy revoke hoặc dùng link cũ',
      );
    }

    const inviteToken = crypto.randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 86_400_000);

    return this.repo.create({
      organizationId: orgId,
      email: normalizedEmail,
      name: input.name?.trim() || null,
      kind: InvitationKind.ADMIN_INVITE,
      invitedRole,
      inviteToken,
      expiresAt,
      invitedById: userId,
      message: input.message?.trim() || null,
      status: InvitationStatus.PENDING,
    });
  }

  async listByOrgForAdmin(filter: { kind?: InvitationKind; status?: InvitationStatus }) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAdmin(orgId);
    return this.repo.listByOrg(orgId, filter);
  }

  /** Admin cancels a PENDING invitation. Works for both kinds. */
  async revoke(id: string, decisionNote?: string): Promise<Invitation> {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAdmin(orgId);
    const userId = this.ctx.requireUserId();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Invitation not found');
    if (row.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ cancel được invitation đang PENDING (hiện tại: ${row.status})`,
      );
    }
    return this.repo.update(id, {
      status: InvitationStatus.CANCELLED,
      decidedById: userId,
      decidedAt: new Date(),
      decisionNote: decisionNote ?? null,
    });
  }

  /** Admin approves a SELF_REQUEST invitation. Creates User + SsoLink
   *  in one transaction using the pre-stored externalUserId. */
  async approveSelfRequest(id: string, decisionNote?: string) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAdmin(orgId);
    const adminUserId = this.ctx.requireUserId();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Invitation not found');
    if (row.kind !== InvitationKind.SELF_REQUEST) {
      throw new BadRequestException('Chỉ approve được SELF_REQUEST');
    }
    if (row.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ approve được invitation PENDING (hiện tại: ${row.status})`,
      );
    }
    if (!row.externalUserId) {
      throw new BadRequestException('SELF_REQUEST không có externalUserId — data corrupt');
    }

    // Idempotency: another admin may have approved concurrently OR
    // this user may have signed up via /register in the meantime. Re-
    // check for an existing User with this email before creating.
    return this.repo.withTransaction(async (tx) => {
      const existingUser = await tx.user.findFirst({
        where: { email: row.email },
      });
      if (existingUser) {
        await tx.invitation.update({
          where: { id },
          data: {
            status: InvitationStatus.COMPLETED,
            decidedById: adminUserId,
            decidedAt: new Date(),
            decisionNote: decisionNote ?? 'Existing user — linked retroactively',
          },
        });
        // Ensure SsoLink exists so future MS logins match.
        await tx.ssoLink.upsert({
          where: {
            provider_externalUserId: {
              provider: SsoProvider.ENTRA,
              externalUserId: row.externalUserId!,
            },
          },
          create: {
            userId: existingUser.id,
            provider: SsoProvider.ENTRA,
            externalUserId: row.externalUserId!,
            externalEmail: row.email,
          },
          update: {},
        });
        return existingUser;
      }

      const placeholderPassword = `${SSO_PLACEHOLDER_PREFIX}${Date.now()}:${row.externalUserId}`;
      const newUser = await tx.user.create({
        data: {
          email: row.email,
          password: placeholderPassword,
          name: row.name,
          role: row.invitedRole,
          organizationId: orgId,
          ssoLinks: {
            create: {
              provider: SsoProvider.ENTRA,
              externalUserId: row.externalUserId!,
              externalEmail: row.email,
            },
          },
        },
      });
      await tx.invitation.update({
        where: { id },
        data: {
          status: InvitationStatus.COMPLETED,
          decidedById: adminUserId,
          decidedAt: new Date(),
          decisionNote: decisionNote ?? null,
        },
      });
      this.logger.log(`Approved SELF_REQUEST ${id} → created User ${newUser.id} in Org ${orgId}`);
      return newUser;
    });
  }

  async rejectSelfRequest(id: string, decisionNote?: string) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAdmin(orgId);
    const adminUserId = this.ctx.requireUserId();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Invitation not found');
    if (row.kind !== InvitationKind.SELF_REQUEST) {
      throw new BadRequestException('Chỉ reject được SELF_REQUEST');
    }
    if (row.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Chỉ reject được invitation PENDING (hiện tại: ${row.status})`);
    }
    return this.repo.update(id, {
      status: InvitationStatus.REJECTED,
      decidedById: adminUserId,
      decidedAt: new Date(),
      decisionNote: decisionNote ?? null,
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // PUBLIC — token-based accept (ADMIN_INVITE)
  // ──────────────────────────────────────────────────────────────────

  /** Resolve token to a public-safe view of the invite for the accept
   *  page. Returns null when token missing / expired / already used. */
  async getByToken(token: string): Promise<PublicInvitationView | null> {
    const row = await this.repo.findByToken(token);
    if (!row) return null;
    if (row.status !== InvitationStatus.PENDING) return null;
    if (this.isExpired(row)) {
      await this.markExpired(row.id);
      return null;
    }
    return {
      id: row.id,
      organizationId: row.organizationId,
      organizationName: (row as any).organization.name,
      organizationSlug: (row as any).organization.slug,
      email: row.email,
      name: row.name,
      message: row.message,
      invitedRole: row.invitedRole,
      status: row.status,
      expiresAt: row.expiresAt,
    };
  }

  /** Accept ADMIN_INVITE by setting a password. Creates User in the
   *  inviting Org + marks Invitation COMPLETED + auto-logs the user
   *  in by returning fresh auth tokens. */
  async acceptByToken(input: { token: string; password: string; name?: string }) {
    const row = await this.repo.findByToken(input.token);
    if (!row) throw new NotFoundException('Lời mời không hợp lệ');
    if (row.kind !== InvitationKind.ADMIN_INVITE) {
      throw new BadRequestException('Token không khớp ADMIN_INVITE');
    }
    if (row.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Lời mời đã ${row.status.toLowerCase()}`);
    }
    if (this.isExpired(row)) {
      await this.markExpired(row.id);
      throw new BadRequestException('Lời mời đã hết hạn');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await this.repo.withTransaction(async (tx) => {
      const conflictUser = await tx.user.findFirst({
        where: { email: row.email },
      });
      if (conflictUser) {
        throw new ConflictException('Email đã được sử dụng — vui lòng đăng nhập trực tiếp');
      }
      const newUser = await tx.user.create({
        data: {
          email: row.email,
          password: passwordHash,
          name: input.name?.trim() || row.name,
          role: row.invitedRole,
          organizationId: row.organizationId,
        },
      });
      await tx.invitation.update({
        where: { id: row.id },
        data: {
          status: InvitationStatus.COMPLETED,
          decidedById: newUser.id,
          decidedAt: new Date(),
        },
      });
      return newUser;
    });

    const tokens = await this.auth.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      employeeId: user.employeeId,
    });
    return { user, ...tokens };
  }

  // ──────────────────────────────────────────────────────────────────
  // SSO callback hook — called by EntraSsoService when an unknown MS
  // email arrives. If a pending ADMIN_INVITE matches the email, accept
  // it transparently (create User + SsoLink, mark COMPLETED) so the
  // SSO login lands inside the Org without needing the magic link.
  // ──────────────────────────────────────────────────────────────────

  async tryAcceptViaSso(input: { email: string; name: string | null; externalUserId: string }) {
    const row = await this.repo.findPendingAdminInviteByEmail(input.email);
    if (!row) return null;

    const user = await this.repo.withTransaction(async (tx) => {
      const conflictUser = await tx.user.findFirst({
        where: { email: row.email },
      });
      if (conflictUser) {
        // Race — another path created the user. Just close the invite.
        await tx.invitation.update({
          where: { id: row.id },
          data: {
            status: InvitationStatus.COMPLETED,
            decidedById: conflictUser.id,
            decidedAt: new Date(),
            decisionNote: 'Auto-completed: user existed at accept time',
          },
        });
        await tx.ssoLink.upsert({
          where: {
            provider_externalUserId: {
              provider: SsoProvider.ENTRA,
              externalUserId: input.externalUserId,
            },
          },
          create: {
            userId: conflictUser.id,
            provider: SsoProvider.ENTRA,
            externalUserId: input.externalUserId,
            externalEmail: input.email,
          },
          update: {},
        });
        return conflictUser;
      }

      const placeholder = `${SSO_PLACEHOLDER_PREFIX}${Date.now()}:${input.externalUserId}`;
      const newUser = await tx.user.create({
        data: {
          email: row.email,
          password: placeholder,
          name: input.name || row.name,
          role: row.invitedRole,
          organizationId: row.organizationId,
          ssoLinks: {
            create: {
              provider: SsoProvider.ENTRA,
              externalUserId: input.externalUserId,
              externalEmail: input.email,
            },
          },
        },
      });
      await tx.invitation.update({
        where: { id: row.id },
        data: {
          status: InvitationStatus.COMPLETED,
          decidedById: newUser.id,
          decidedAt: new Date(),
          decisionNote: 'Auto-accepted via SSO',
        },
      });
      return newUser;
    });

    this.logger.log(`Auto-accepted ADMIN_INVITE for ${input.email} via SSO → User ${user.id}`);
    return user;
  }

  // ──────────────────────────────────────────────────────────────────
  // SELF_REQUEST — created from the SSO orphan flow (called by
  // EntraSsoService once the orphan page submits a join request).
  // ──────────────────────────────────────────────────────────────────

  async createSelfRequest(input: {
    orgId: string;
    email: string;
    name?: string | null;
    externalUserId: string;
    message?: string;
  }) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existingPending = await this.repo.findPendingSelfRequest(
      input.orgId,
      normalizedEmail,
      input.externalUserId,
    );
    if (existingPending) {
      throw new ConflictException('Bạn đã có 1 yêu cầu đang chờ duyệt cho tổ chức này');
    }
    // Also block if an existing User already covers this email + Org
    // (admin invited and accepted while user was filling the form).
    const existingUser = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, organizationId: input.orgId },
    });
    if (existingUser) {
      throw new ConflictException('Tài khoản đã tồn tại trong tổ chức — đăng nhập lại để vào');
    }
    return this.repo.create({
      organizationId: input.orgId,
      email: normalizedEmail,
      name: input.name?.trim() || null,
      kind: InvitationKind.SELF_REQUEST,
      externalUserId: input.externalUserId,
      message: input.message?.trim() || null,
      status: InvitationStatus.PENDING,
    });
  }

  /** User withdraws their own SELF_REQUEST. Identified by externalUserId
   *  from the orphan session (no auth required since user isn't a
   *  member of any Org yet). */
  async withdrawSelfRequest(input: { id: string; externalUserId: string }) {
    const row = await this.repo.findByIdRaw(input.id);
    if (!row) throw new NotFoundException('Invitation not found');
    if (row.kind !== InvitationKind.SELF_REQUEST) {
      throw new BadRequestException('Chỉ withdraw được SELF_REQUEST');
    }
    if (row.externalUserId !== input.externalUserId) {
      throw new ForbiddenException('Yêu cầu này không thuộc về bạn');
    }
    if (row.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ withdraw được invitation PENDING (hiện tại: ${row.status})`,
      );
    }
    return this.repo.update(input.id, {
      status: InvitationStatus.CANCELLED,
      decidedAt: new Date(),
      decisionNote: 'Withdrawn by requester',
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private isExpired(row: Invitation): boolean {
    return !!row.expiresAt && row.expiresAt.getTime() <= Date.now();
  }

  private async markExpired(id: string) {
    await this.repo.update(id, {
      status: InvitationStatus.EXPIRED,
      decidedAt: new Date(),
      decisionNote: 'Auto-expired',
    });
  }
}
