import { AssigneeRole } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

export interface ResolveAssigneeInput {
  prisma: PrismaService;
  organizationId: string;
  employeeId: string;
  role: AssigneeRole;
  customUserId?: string | null;
  /** Fallback user when resolution fails (typically plan.createdById). */
  fallbackUserId: string;
}

/**
 * Resolve AssigneeRole → User.id for OnboardingTask creation. Hierarchy of
 * fallbacks so plan creation never fails on missing user.
 *
 * - HR       → first HRM AppAdmin in the org (sorted by createdAt asc).
 * - MANAGER  → employee.department.manager.user.id.
 * - EMPLOYEE → employee.user.id (the new hire themselves).
 * - IT       → no IT scope in C-HR yet → fallback to HR resolution.
 * - CUSTOM   → customUserId; validated to belong to the same Org.
 *
 * Any unresolved path falls through to `fallbackUserId` (caller-supplied).
 */
export async function resolveAssignee(input: ResolveAssigneeInput): Promise<string> {
  const { prisma, organizationId, employeeId, role, customUserId, fallbackUserId } = input;

  if (role === AssigneeRole.CUSTOM) {
    if (customUserId) {
      const user = await prisma.user.findFirst({
        where: { id: customUserId, organizationId },
        select: { id: true },
      });
      if (user) return user.id;
    }
    return fallbackUserId;
  }

  if (role === AssigneeRole.EMPLOYEE) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { user: { select: { id: true } } },
    });
    return employee?.user?.id ?? fallbackUserId;
  }

  if (role === AssigneeRole.MANAGER) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        department: {
          select: {
            manager: { select: { user: { select: { id: true } } } },
          },
        },
      },
    });
    return employee?.department?.manager?.user?.id ?? fallbackUserId;
  }

  // HR (and IT — no IT scope yet, fall through to HR).
  const hrAdmin = await prisma.appAdmin.findFirst({
    where: { organizationId, appCode: 'HRM' },
    orderBy: { createdAt: 'asc' },
    select: { userId: true },
  });
  return hrAdmin?.userId ?? fallbackUserId;
}
