import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CandidateSource } from '@prisma/client';

export class ListCandidatesDto {
  @ApiPropertyOptional({ enum: CandidateSource })
  @IsOptional()
  @IsEnum(CandidateSource)
  source?: CandidateSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(127)
  q?: string;
}
