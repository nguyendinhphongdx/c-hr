import { EventStatus, EventVisibility } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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

  /** Replace the full resource booking set. Pass `[]` to clear all
   *  current bookings; omit (undefined) to leave them unchanged.
   *  Conflict check + ownership validation runs in the service. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID(undefined, { each: true })
  resourceIds?: string[];
}
