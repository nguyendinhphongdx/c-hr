import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DecideCorrectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  decisionNote?: string;
}
