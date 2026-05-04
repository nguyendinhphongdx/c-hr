import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DecideRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  decisionNote?: string;
}
