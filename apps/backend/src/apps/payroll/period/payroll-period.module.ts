import { Module } from '@nestjs/common';

import { TimesheetModule } from '@/apps/attendance/timesheet/timesheet.module';

import { PayrollConfigModule } from '../config/payroll-config.module';

import { PayrollPeriodController } from './payroll-period.controller';
import { PayrollPeriodRepository } from './payroll-period.repository';
import { PayrollPeriodService } from './payroll-period.service';

@Module({
  imports: [PayrollConfigModule, TimesheetModule],
  controllers: [PayrollPeriodController],
  providers: [PayrollPeriodService, PayrollPeriodRepository],
  exports: [PayrollPeriodService, PayrollPeriodRepository],
})
export class PayrollPeriodModule {}
