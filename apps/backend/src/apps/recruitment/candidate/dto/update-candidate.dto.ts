import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateCandidateDto } from './create-candidate.dto';

/**
 * Email is the dedup key — once a Candidate is created, email is
 * immutable. If someone supplies a different email they should create
 * a new candidate (or merge — Phase 5).
 */
export class UpdateCandidateDto extends PartialType(
  OmitType(CreateCandidateDto, ['email'] as const),
) {}
