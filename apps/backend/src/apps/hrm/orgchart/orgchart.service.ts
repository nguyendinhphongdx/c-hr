import { Injectable, NotFoundException } from '@nestjs/common';

import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

interface AncestorRow {
  id: string;
  parent_id: string | null;
  manager_id: string | null;
  depth: number;
}

export interface CandidateUser {
  userId: string;
  employeeId: string | null;
  email: string;
  name: string | null;
}

@Injectable()
export class OrgChartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
  ) {}

  /**
   * Flat list of active departments in the Org. The FE builds a tree from
   * parentId — keeping this server-side as a flat array makes it cheap to
   * cache and easy to filter client-side.
   */
  async getDepartmentTree() {
    const orgId = this.ctx.requireOrg();
    return this.prisma.department.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Walk the department parent chain starting from `employeeId`'s
   * department, collecting the managerId at each hop. Excludes the
   * employee themselves to avoid self-management. Returns Employee
   * rows (subset) ordered nearest-first.
   */
  async getReportingLine(employeeId: string) {
    const orgId = this.ctx.requireOrg();
    const employee = await this.requireEmployeeInOrg(orgId, employeeId);
    const startDeptId = await this.resolveStartDept(orgId, employee);
    if (!startDeptId) return [];

    const managerIds = await this.collectManagerChain(startDeptId, employeeId);
    if (managerIds.length === 0) return [];

    const managers = await this.prisma.employee.findMany({
      where: { id: { in: managerIds }, organizationId: orgId, deletedAt: null },
      select: {
        id: true,
        code: true,
        title: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Preserve nearest-first order (managerIds is already in that order).
    const byId = new Map(managers.map((m) => [m.id, m]));
    return managerIds.map((id) => byId.get(id)).filter((m): m is NonNullable<typeof m> => !!m);
  }

  /**
   * Per ADR 0004 + domain.md "Approver lookup logic":
   *   - suggested = getNearestManager(X). Null → first HRM appadmin.
   *   - candidates = manager chain ∪ HRM appadmins ∪ admin Org users.
   *
   * Used by Leave/Correction request flows (F4) when the requester picks
   * who should approve. FE shows `suggested` as the default and
   * `candidates` as the dropdown options.
   */
  async getApproverCandidates(employeeId: string) {
    const orgId = this.ctx.requireOrg();
    const employee = await this.requireEmployeeInOrg(orgId, employeeId);
    const startDeptId = await this.resolveStartDept(orgId, employee);

    // Manager chain (nearest first).
    const managerIds = startDeptId ? await this.collectManagerChain(startDeptId, employeeId) : [];

    // HRM appadmins + Org admins. Both groups have permission to approve
    // org-structure-related workflows; surfacing them as candidates lets the
    // requester pick a fallback when no manager is set up.
    const fallbackUsers = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { role: 'admin' },
          { role: 'sysowner' },
          { appAdmins: { some: { appCode: 'HRM', organizationId: orgId } } },
        ],
        employeeId: { not: null },
      },
      select: { id: true, email: true, name: true, employeeId: true },
    });

    // Pull employee rows + their User for display info (name, email).
    const candidateEmployeeIds = new Set<string>([
      ...managerIds,
      ...fallbackUsers.map((u) => u.employeeId).filter((id): id is string => !!id),
    ]);
    candidateEmployeeIds.delete(employeeId);

    if (candidateEmployeeIds.size === 0) {
      return { suggested: null, candidates: [] as CandidateUser[] };
    }

    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: Array.from(candidateEmployeeIds) },
        organizationId: orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const candidates: CandidateUser[] = employees.map((e) => ({
      employeeId: e.id,
      userId: e.user?.id ?? '',
      email: e.user?.email ?? '',
      name: e.user?.name ?? '',
    }));

    // Suggested = nearest manager (still alive in candidates), else first
    // HRM appadmin / admin in the candidate list.
    const nearest = managerIds.find((id) => candidateEmployeeIds.has(id)) ?? null;
    const suggested = nearest
      ? (candidates.find((c) => c.employeeId === nearest) ?? null)
      : (candidates[0] ?? null);

    return { suggested, candidates };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private async requireEmployeeInOrg(orgId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      select: { id: true, departmentId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found in organization');
    return employee;
  }

  /**
   * Pick the department to start the chain walk from. Prefer the
   * employee's own departmentId; if it's null, fall back to a department
   * they manage. This keeps reporting-line useful even when the manager's
   * dept assignment hasn't been set yet (legacy data, post-signup state).
   */
  private async resolveStartDept(
    orgId: string,
    employee: { id: string; departmentId: string | null },
  ): Promise<string | null> {
    if (employee.departmentId) return employee.departmentId;
    const managed = await this.prisma.department.findFirst({
      where: { managerId: employee.id, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    return managed?.id ?? null;
  }

  /**
   * Walk the department parent chain via Postgres recursive CTE,
   * returning the manager ids ordered nearest-first. Skips the
   * `selfEmployeeId` so an employee never reports to themselves.
   * Capped at 64 hops as a runaway-cycle defense.
   */
  private async collectManagerChain(
    startDeptId: string,
    selfEmployeeId: string,
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<AncestorRow[]>`
      WITH RECURSIVE ancestor(id, parent_id, manager_id, depth) AS (
        SELECT id, parent_id, manager_id, 0
        FROM departments
        WHERE id = ${startDeptId} AND deleted_at IS NULL
        UNION ALL
        SELECT d.id, d.parent_id, d.manager_id, a.depth + 1
        FROM departments d
        JOIN ancestor a ON d.id = a.parent_id
        WHERE d.deleted_at IS NULL AND a.depth < 64
      )
      SELECT * FROM ancestor ORDER BY depth ASC
    `;

    const seen = new Set<string>();
    const managerIds: string[] = [];
    for (const row of rows) {
      const m = row.manager_id;
      if (!m || m === selfEmployeeId || seen.has(m)) continue;
      seen.add(m);
      managerIds.push(m);
    }
    return managerIds;
  }
}
