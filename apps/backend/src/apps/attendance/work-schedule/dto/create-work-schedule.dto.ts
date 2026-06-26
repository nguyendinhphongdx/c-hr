import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export enum AttendanceModeDto {
  FIXED = 'FIXED',
  FLEXIBLE = 'FLEXIBLE',
}

export class ShiftInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  /** "HH:MM" 24h. */
  @Matches(HHMM, { message: 'startTime must be HH:MM (24h)' })
  startTime: string;

  /** "HH:MM" 24h. May be earlier than startTime when crossesMidnight=true. */
  @Matches(HHMM, { message: 'endTime must be HH:MM (24h)' })
  endTime: string;

  /** ISO weekdays 1=Mon..7=Sun. At least one. */
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  daysOfWeek: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  breakMinutes?: number;

  @IsOptional()
  @IsBoolean()
  crossesMidnight?: boolean;

  @IsOptional()
  @IsEnum(AttendanceModeDto)
  mode?: AttendanceModeDto;

  /** FIXED only — minutes allowed after startTime before marking LATE. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  lateGraceMinutes?: number;

  /** FLEXIBLE only — width of the check-in window in minutes (e.g. 60 = 08:00–09:00). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  windowMinutes?: number;
}

export class CreateWorkScheduleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  /** ISO-8601 datetime. null/omitted = baseline (active from the beginning). */
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShiftInputDto)
  shifts: ShiftInputDto[];
}
