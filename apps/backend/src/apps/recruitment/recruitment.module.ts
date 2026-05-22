import { Module } from '@nestjs/common';

import { JobModule } from './job/job.module';

/**
 * Recruitment / ATS bounded context — F11.
 *
 * Phase 1: Job + (next) Candidate + Application.
 * Phase 2: JobBoardIntegration adapters (talent.vn first).
 * Phase 3: Interview + Scorecard + Offer.
 */
@Module({
  imports: [JobModule],
  exports: [JobModule],
})
export class RecruitmentModule {}
