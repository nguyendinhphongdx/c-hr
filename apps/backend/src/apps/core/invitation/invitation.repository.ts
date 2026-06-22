import { Injectable } from '@nestjs/common';
import { Invitation, InvitationKind, InvitationStatus, Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

@Injectable()
export class InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdByOrg(orgId: string, id: string) {
    return this.prisma.invitation.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  /** Look up by raw id without an Org filter — only used by token-based
   *  endpoints where the token itself is the trust signal. */
  findByIdRaw(id: string) {
    return this.prisma.invitation.findUnique({ where: { id } });
  }

  findByToken(token: string) {
    return this.prisma.invitation.findUnique({
      where: { inviteToken: token },
      include: { organization: { select: { name: true, slug: true } } },
    });
  }

  /** Pending ADMIN_INVITE for an email (across all Orgs — needed by the
   *  SSO callback to auto-accept on first MS login). */
  findPendingAdminInviteByEmail(email: string) {
    return this.prisma.invitation.findFirst({
      where: {
        email: email.toLowerCase(),
        kind: InvitationKind.ADMIN_INVITE,
        status: InvitationStatus.PENDING,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  /** Pending SELF_REQUEST for an (email, externalUserId) pair within an
   *  Org. Used to dedupe before creating a new request. */
  findPendingSelfRequest(orgId: string, email: string, externalUserId: string) {
    return this.prisma.invitation.findFirst({
      where: {
        organizationId: orgId,
        email: email.toLowerCase(),
        externalUserId,
        kind: InvitationKind.SELF_REQUEST,
        status: InvitationStatus.PENDING,
      },
    });
  }

  listByOrg(
    orgId: string,
    filter: { kind?: InvitationKind; status?: InvitationStatus },
  ) {
    const where: Prisma.InvitationWhereInput = {
      organizationId: orgId,
      ...(filter.kind ? { kind: filter.kind } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    return this.prisma.invitation.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  create(data: Prisma.InvitationUncheckedCreateInput): Promise<Invitation> {
    return this.prisma.invitation.create({ data });
  }

  update(id: string, data: Prisma.InvitationUncheckedUpdateInput) {
    return this.prisma.invitation.update({ where: { id }, data });
  }

  /** Run a callback inside a transaction with the same client. Used by
   *  the accept flow which creates User + SsoLink + updates Invitation
   *  in one atomic step. */
  async withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
