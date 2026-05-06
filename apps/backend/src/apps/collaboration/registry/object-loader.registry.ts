import { Injectable } from '@nestjs/common';

import { DepartmentAcl } from '@/apps/hrm/department/department.acl';
import { EmployeeAcl } from '@/apps/hrm/employee/employee.acl';
import { RequestAcl } from '@/apps/requests/request/request.acl';
import { BaseAcl } from '@/common/acl';
import { PrismaService } from '@libs/database/prisma.service';

interface RegistryEntry<T extends { id: string; organizationId: string }> {
  model: 'request' | 'employee' | 'department';
  Acl?: new (obj: T) => BaseAcl<T, any>;
  softDelete: boolean;
}

/**
 * Central, hardcoded mapping from `objectType` token (the wire-side
 * polymorphic identifier used by comments + activities) to the Prisma
 * model + ACL class. New entity types are added here, not via plugin
 * registration — keeps the surface auditable.
 */
@Injectable()
export class ObjectLoaderRegistry {
  private readonly entries: Record<string, RegistryEntry<any>> = {
    Request: { model: 'request', Acl: RequestAcl, softDelete: false },
    Employee: { model: 'employee', Acl: EmployeeAcl, softDelete: true },
    Department: { model: 'department', Acl: DepartmentAcl, softDelete: true },
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
    const row = await (this.prisma as any)[entry.model].findFirst({ where });
    return { entry, row };
  }
}
