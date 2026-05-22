import { Module } from '@nestjs/common';

import { ApplicationModule } from './application/application.module';
import { CandidateModule } from './candidate/candidate.module';
import { JobModule } from './job/job.module';

/**
 * Recruitment / ATS bounded context — F11.
 *
 * Phase 1: Job + Candidate + Application (done).
 * Phase 2: JobBoardIntegration adapters (talent.vn first).
 * Phase 3: Interview + Scorecard + Offer.
 */
@Module({
  imports: [JobModule, CandidateModule, ApplicationModule],
  exports: [JobModule, CandidateModule, ApplicationModule],
})
export class RecruitmentModule {}
