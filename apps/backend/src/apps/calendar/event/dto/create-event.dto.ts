import { EventVisibility } from '@prisma/client';
import { Type } from 'class-transformer';
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateEventAttendeeDto {
  /** Internal attendee — User in the same Org. Either this OR `email`. */
  @IsOptional()
  @IsUUID()
  userId?: string;

  /** External attendee — email-only. */
  @IsOptional()
  @IsString()
  @MaxLength(127)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(127)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

export class CreateEventDto {
  @IsString()
  @MaxLength(511)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1023)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1023)
  conferenceUrl?: string;

  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  /** Override owner — defaults to caller (User). Admins may set on behalf. */
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateEventAttendeeDto)
  @ValidateIf((_, v) => Array.isArray(v))
  attendees?: CreateEventAttendeeDto[];
}
