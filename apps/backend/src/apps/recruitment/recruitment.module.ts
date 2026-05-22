import { Module } from '@nestjs/common';

import { ApplicationModule } from './application/application.module';
import { CandidateModule } from './candidate/candidate.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { JobModule } from './job/job.module';

/**
 * Recruitment / ATS bounded context — F11.
 *
 * Phase 1: Job + Candidate + Application (done).
 * Phase 2: Job-board integration (TALENT_VN done; TopCV + ITviec stub).
 * Phase 3: Interview + Scorecard + Offer.
 */
@Module({
  imports: [
    JobModule,
    CandidateModule,
    ApplicationModule,
    IntegrationsModule,
  ],
  exports: [
    JobModule,
    CandidateModule,
    ApplicationModule,
    IntegrationsModule,
  ],
})
export class RecruitmentModule {}
