import { Module } from '@nestjs/common';

import { AttendanceLogModule } from '../attendance-log/attendance-log.module';
import { WorkScheduleModule } from '../work-schedule/work-schedule.module';

import { TimesheetController } from './timesheet.controller';
import { TimesheetService } from './timesheet.service';

@Module({
  imports: [WorkScheduleModule, AttendanceLogModule],
  controllers: [TimesheetController],
  providers: [TimesheetService],
  exports: [TimesheetService],
})
export class TimesheetModule {}
