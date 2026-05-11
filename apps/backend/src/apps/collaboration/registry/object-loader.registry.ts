import { Injectable } from '@nestjs/common';

import { EventAcl } from '@/apps/calendar/event/event.acl';
import { DepartmentAcl } from '@/apps/hrm/department/department.acl';
import { EmployeeAcl } from '@/apps/hrm/employee/employee.acl';
import { RequestAcl } from '@/apps/requests/request/request.acl';
import { ProjectAcl } from '@/apps/work/project/project.acl';
import { TaskAcl } from '@/apps/work/task/task.acl';
import { BaseAcl } from '@/common/acl';
import { PrismaService } from '@libs/database/prisma.service';

interface RegistryEntry<T extends { id: string; organizationId: string }> {
  model: 'request' | 'employee' | 'department' | 'event' | 'project' | 'task';
  Acl?: new (obj: T) => BaseAcl<T, any>;
  softDelete: boolean;
  /**
   * Optional hydrate hook — runs after the base row fetch and returns the
   * subject passed to the ACL. Lets entries pre-load relation data the
   * ACL needs (e.g. Project members for Task, watcher userIds for Task)
   * without bloating the central findFirst call for every entry.
   */
  hydrate?: (prisma: PrismaService, row: any) => Promise<any>;
}

/**
 * Central, hardcoded mapping from `objectType` token (the wire-side
 * polymorphic identifier used by comments + activities + tags) to the
 * Prisma model + ACL class. New entity types are added here, not via
 * plugin registration — keeps the surface auditable.
 */
@Injectable()
export class ObjectLoaderRegistry {
  private readonly entries: Record<string, RegistryEntry<any>> = {
    Request: { model: 'request', Acl: RequestAcl, softDelete: false },
    Employee: { model: 'employee', Acl: EmployeeAcl, softDelete: true },
    Department: { model: 'department', Acl: DepartmentAcl, softDelete: true },
    Event: { model: 'event', Acl: EventAcl, softDelete: true },
    Project: {
      model: 'project',
      Acl: ProjectAcl,
      softDelete: true,
      hydrate: async (prisma, row) => {
        const members = await prisma.projectMember.findMany({
          where: { projectId: row.id },
          select: { userId: true, role: true },
        });
        const memberRoles = new Map<string, (typeof members)[number]['role']>();
        for (const m of members) memberRoles.set(m.userId, m.role);
        return { ...row, _memberRoles: memberRoles };
      },
    },
    Task: {
      model: 'task',
      Acl: TaskAcl,
      softDelete: true,
      hydrate: async (prisma, row) => {
        const [project, watchers] = await Promise.all([
          prisma.project.findUnique({
            where: { id: row.projectId },
            select: {
              ownerId: true,
              visibility: true,
              members: { select: { userId: true, role: true } },
            },
          }),
          prisma.taskWatcher.findMany({
            where: { taskId: row.id },
            select: { userId: true },
          }),
        ]);
        const memberRoles = new Map<string, 'OWNER' | 'EDITOR' | 'COMMENTER' | 'VIEWER'>();
        for (const m of project?.members ?? []) memberRoles.set(m.userId, m.role);
        return {
          ...row,
          _project: project
            ? {
                ownerId: project.ownerId,
                visibility: project.visibility,
                _memberRoles: memberRoles,
              }
            : undefined,
          _watcherUserIds: watchers.map((w) => w.userId),
        };
      },
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    objectType: string,
    orgId: string,
    id: string,
  ): Promise<{ entry: RegistryEntry<any> | undefined; row: any | null }> {
    const entry = this.entries[objectType];
    if (!entry) return { entry: undefined, row: null };
    const where: Record<string, unknown> = { id, organizationId: orgId };
    if (entry.softDelete) where.deletedAt = null;
    const baseRow = await (this.prisma as any)[entry.model].findFirst({ where });
    if (!baseRow) return { entry, row: null };
    const row = entry.hydrate ? await entry.hydrate(this.prisma, baseRow) : baseRow;
    return { entry, row };
  }
}
