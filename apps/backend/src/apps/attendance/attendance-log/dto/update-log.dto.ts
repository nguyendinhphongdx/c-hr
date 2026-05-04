import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

const passThrough = ({ value }: { value: unknown }) => value;

export class UpdateAttendanceLogDto {
  @Transform(passThrough)
  @IsOptional()
  @IsDateString()
  checkInAt?: string | null;

  @Transform(passThrough)
  @IsOptional()
  @IsDateString()
  checkOutAt?: string | null;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
