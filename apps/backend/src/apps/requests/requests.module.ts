import { Module } from '@nestjs/common';

import { AttendanceCorrectionModule } from './attendance-correction/attendance-correction.module';
import { LeaveRequestModule } from './leave-request/leave-request.module';

/**
 * Requests bounded context — leave + attendance corrections + (future)
 * other approval workflows. All requests share the same orgchart-driven
 * approver routing and PENDING → APPROVED|REJECTED|CANCELLED state machine.
 *
 * Per ADR 0005, cross-context imports must go through this barrel.
 */
@Module({
  imports: [LeaveRequestModule, AttendanceCorrectionModule],
  exports: [LeaveRequestModule, AttendanceCorrectionModule],
})
export class RequestsModule {}
