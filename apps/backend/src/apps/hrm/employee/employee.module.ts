import { Module } from '@nestjs/common';

import { EmployeeController } from './employee.controller';
import { EmployeeImportService } from './employee-import.service';
import { EmployeeListener } from './employee.listener';
import { EmployeeRepository } from './employee.repository';
import { EmployeeService } from './employee.service';

@Module({
  controllers: [EmployeeController],
  providers: [EmployeeService, EmployeeImportService, EmployeeRepository, EmployeeListener],
  exports: [EmployeeService, EmployeeRepository],
})
export class EmployeeModule {}
