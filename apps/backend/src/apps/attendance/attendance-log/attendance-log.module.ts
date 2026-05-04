import { Module } from '@nestjs/common';

import { AttendanceLogController } from './attendance-log.controller';
import { AttendanceLogRepository } from './attendance-log.repository';
import { AttendanceLogService } from './attendance-log.service';

@Module({
  controllers: [AttendanceLogController],
  providers: [AttendanceLogService, AttendanceLogRepository],
  exports: [AttendanceLogService, AttendanceLogRepository],
})
export class AttendanceLogModule {}
