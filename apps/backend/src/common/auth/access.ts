import { AppCode, User } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

/**
 * Authorization helpers per ADR 0003 (no-permission-engine).
 *
 * Hierarchy: sysowner ⊃ admin (Org) ⊃ appadmin (per-app) ⊃ user.
 * Higher tiers automatically pass lower-tier checks — admin Org never
 * needs an AppAdmin record to act as appadmin for any app in that Org.
 *
 * Services call these directly in if/else, then throw AccessException
 * (or NestJS ForbiddenException) when the check fails.
 */

/**
 * Org-level admin check.
 *
 * Pass when:
 *   - user.role === 'sysowner' (cross-Org), OR
 *   - user.role === 'admin' AND user.organizationId === organizationId.
 */
export function isAdmin(user: User, organizationId: string): boolean {
  if (user.role === 'sysowner') return true;
  return user.role === 'admin' && user.organizationId === organizationId;
}

/**
 * Per-app admin check.
 *
 * Pass when:
 *   - isAdmin(user, organizationId) — admin/sysowner inherit, OR
 *   - user belongs to the Org AND has an AppAdmin record for (app, Org).
 */
export async function isAppAdmin(
  user: User,
  app: AppCode,
  organizationId: string,
  prisma: PrismaService,
): Promise<boolean> {
  if (isAdmin(user, organizationId)) return true;
  if (user.organizationId !== organizationId) return false;
  const found = await prisma.appAdmin.findUnique({
    where: {
      userId_organizationId_appCode: {
        userId: user.id,
        organizationId,
        appCode: app,
      },
    },
    select: { id: true },
  });
  return !!found;
}
