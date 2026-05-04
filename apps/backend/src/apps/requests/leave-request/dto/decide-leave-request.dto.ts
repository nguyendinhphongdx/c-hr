import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for /approve and /reject. `decisionNote` is required for reject
 * (enforced in service), optional for approve.
 */
export class DecideLeaveRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  decisionNote?: string;
}
