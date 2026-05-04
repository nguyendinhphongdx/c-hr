import { Module } from '@nestjs/common';

import { WorkScheduleController } from './work-schedule.controller';
import { WorkScheduleRepository } from './work-schedule.repository';
import { WorkScheduleService } from './work-schedule.service';

@Module({
  controllers: [WorkScheduleController],
  providers: [WorkScheduleService, WorkScheduleRepository],
  exports: [WorkScheduleService, WorkScheduleRepository],
})
export class WorkScheduleModule {}
