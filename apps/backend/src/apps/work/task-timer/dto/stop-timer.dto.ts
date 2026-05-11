import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StopTimerDto {
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  note?: string;
}
