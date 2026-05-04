import { Module } from '@nestjs/common';

import { DepartmentModule } from './department/department.module';
import { EmployeeModule } from './employee/employee.module';

/**
 * HRM bounded context — department, employee, orgchart (F2.4),
 * and any other Org-structure modules.
 *
 * Per ADR 0005, cross-context imports must go through this barrel
 * (or a service it explicitly exports), not deep into apps/hrm/<x>/.
 */
@Module({
  imports: [DepartmentModule, EmployeeModule],
  exports: [DepartmentModule, EmployeeModule],
})
export class HrmModule {}
