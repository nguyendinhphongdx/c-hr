import { Module } from '@nestjs/common';

import { DepartmentModule } from './department/department.module';

/**
 * HRM bounded context — employee, department, orgchart (F2.4),
 * and any other Org-structure modules.
 *
 * Per ADR 0005, cross-context imports must go through this barrel
 * (or a service it explicitly exports), not deep into apps/hrm/<x>/.
 */
@Module({
  imports: [DepartmentModule],
  exports: [DepartmentModule],
})
export class HrmModule {}
