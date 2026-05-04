import { ForbiddenException } from '@nestjs/common';
import { AppCode } from '@prisma/client';

import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

/**
 * Authorization helpers per ADR 0003 (no-permission-engine) + 0007
 * (services read from RequestContext).
 *
 * Hierarchy: sysowner ⊃ admin (Org) ⊃ appadmin (per-app) ⊃ user.
 * Higher tiers automatically pass lower-tier checks — admin Org never
 * needs an AppAdmin record to act as appadmin for any app in that Org.
 *
 * The Org-level helpers (`isAdmin`, `requireAdmin`) live as methods on
 * `RequestContextService`. The appadmin helpers stay here as functions
 * because they need a `PrismaService` which the ctx doesn't carry.
 */

/**
 * Per-app admin check. Reads role/orgId from ctx.
 *
 * Pass when:
 *   - ctx.isAdmin(organizationId) — admin/sysowner inherit, OR
 *   - the user belongs to `organizationId` AND has an AppAdmin record
 *     for `(app, organizationId)`.
 */
export async function isAppAdmin(
  ctx: RequestContextService,
  app: AppCode,
  organizationId: string,
  prisma: PrismaService,
): Promise<boolean> {
  if (ctx.isAdmin(organizationId)) return true;
  if (ctx.organizationId !== organizationId) return false;
  const userId = ctx.userId;
  if (!userId) return false;
  const found = await prisma.appAdmin.findUnique({
    where: {
      userId_organizationId_appCode: {
        userId,
        organizationId,
        appCode: app,
      },
    },
    select: { id: true },
  });
  return !!found;
}

/**
 * Throws `ForbiddenException` if `isAppAdmin` returns false. Returns void
 * for ergonomic chaining at the top of service methods.
 */
export async function requireAppAdmin(
  ctx: RequestContextService,
  app: AppCode,
  organizationId: string,
  prisma: PrismaService,
): Promise<void> {
  const ok = await isAppAdmin(ctx, app, organizationId, prisma);
  if (!ok) {
    throw new ForbiddenException(`Need ${app} appadmin or admin role`);
  }
}
