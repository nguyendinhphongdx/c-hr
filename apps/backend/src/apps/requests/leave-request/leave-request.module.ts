import { Module } from '@nestjs/common';

import { HrmModule } from '@/apps/hrm/hrm.module';

import { LeaveRequestController } from './leave-request.controller';
import { LeaveRequestRepository } from './leave-request.repository';
import { LeaveRequestService } from './leave-request.service';

@Module({
  imports: [HrmModule],
  controllers: [LeaveRequestController],
  providers: [LeaveRequestService, LeaveRequestRepository],
  exports: [LeaveRequestService, LeaveRequestRepository],
})
export class LeaveRequestModule {}
