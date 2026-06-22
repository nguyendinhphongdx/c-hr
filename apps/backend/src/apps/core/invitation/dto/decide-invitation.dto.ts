import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DecideInvitationDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  decisionNote?: string;
}
