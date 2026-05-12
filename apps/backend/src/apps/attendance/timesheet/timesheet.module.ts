import { Module } from '@nestjs/common';

import { AttendanceLogModule } from '../attendance-log/attendance-log.module';
import { HolidayModule } from '../holiday/holiday.module';
import { WorkScheduleModule } from '../work-schedule/work-schedule.module';

import { TimesheetReportController } from './timesheet-report.controller';
import { TimesheetReportService } from './timesheet-report.service';
import { TimesheetController } from './timesheet.controller';
import { TimesheetService } from './timesheet.service';

@Module({
  imports: [WorkScheduleModule, AttendanceLogModule, HolidayModule],
  controllers: [TimesheetController, TimesheetReportController],
  providers: [TimesheetService, TimesheetReportService],
  exports: [TimesheetService, TimesheetReportService],
})
export class TimesheetModule {}
