import { EventVisibility, Gender } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

const passThrough = ({ value }: { value: unknown }) => value;

/**
 * Self-update payload for /users/me. Whitelists only fields the user
 * is allowed to change about themselves — role, organizationId,
 * employeeId are NOT here on purpose (managed by admin / HR flows).
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @Transform(passThrough)
  @IsOptional()
  @IsDateString()
  dob?: string | null;

  @Transform(passThrough)
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  /** Default visibility applied when creating an event without one. */
  @IsOptional()
  @IsEnum(EventVisibility)
  calendarDefaultVisibility?: EventVisibility;
}
