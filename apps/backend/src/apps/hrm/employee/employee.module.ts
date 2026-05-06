import { Module } from '@nestjs/common';

import { EmployeeController } from './employee.controller';
import { EmployeeImportService } from './employee-import.service';
import { EmployeeRepository } from './employee.repository';
import { EmployeeService } from './employee.service';

@Module({
  controllers: [EmployeeController],
  providers: [EmployeeService, EmployeeImportService, EmployeeRepository],
  exports: [EmployeeService, EmployeeRepository],
})
export class EmployeeModule {}
