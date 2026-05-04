import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const passThrough = ({ value }: { value: unknown }) => value;

export class UpdateAttendanceDeviceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipAddress?: string | null;
}
