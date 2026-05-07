import { Module } from '@nestjs/common';

import { AttendanceDeviceModule } from './attendance-device/attendance-device.module';
import { AttendanceLogModule } from './attendance-log/attendance-log.module';
import { TimesheetModule } from './timesheet/timesheet.module';
import { WorkScheduleModule } from './work-schedule/work-schedule.module';

/**
 * Attendance bounded context — work schedules, devices, logs, timesheet
 * queries. Per ADR 0005, cross-context imports must go through this barrel.
 */
@Module({
  imports: [WorkScheduleModule, AttendanceDeviceModule, AttendanceLogModule, TimesheetModule],
  exports: [WorkScheduleModule, AttendanceDeviceModule, AttendanceLogModule, TimesheetModule],
})
export class AttendanceModule {}
