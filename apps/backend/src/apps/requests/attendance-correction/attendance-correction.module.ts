import { Module } from '@nestjs/common';

import { HrmModule } from '@/apps/hrm/hrm.module';

import { AttendanceCorrectionController } from './attendance-correction.controller';
import { AttendanceCorrectionRepository } from './attendance-correction.repository';
import { AttendanceCorrectionService } from './attendance-correction.service';

@Module({
  imports: [HrmModule],
  controllers: [AttendanceCorrectionController],
  providers: [AttendanceCorrectionService, AttendanceCorrectionRepository],
  exports: [AttendanceCorrectionService, AttendanceCorrectionRepository],
})
export class AttendanceCorrectionModule {}
