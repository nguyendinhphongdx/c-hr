import { DeviceBrand } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAttendanceDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  /** Friendly serial set by admin. Unique within Org. */
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  serial: string;

  @IsOptional()
  @IsEnum(DeviceBrand)
  brand?: DeviceBrand;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipAddress?: string;
}
