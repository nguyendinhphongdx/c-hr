import { Module } from '@nestjs/common';

import { CandidateController } from './candidate.controller';
import { CandidateRepository } from './candidate.repository';
import { CandidateService } from './candidate.service';

@Module({
  controllers: [CandidateController],
  providers: [CandidateService, CandidateRepository],
  exports: [CandidateService, CandidateRepository],
})
export class CandidateModule {}
