import { EventStatus, EventVisibility } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * PATCH semantics — fields omitted stay unchanged. Attendee list edits
 * go through dedicated /attendees endpoints rather than via this DTO.
 */
export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(511)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1023)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1023)
  conferenceUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string | null;
}
