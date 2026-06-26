import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { ShiftInputDto } from './create-work-schedule.dto';

export class UpdateWorkScheduleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | null;

  /** Pass to fully replace the shift list. Omit to keep existing shifts. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShiftInputDto)
  shifts?: ShiftInputDto[];
}
