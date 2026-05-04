import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAttendanceCorrectionDto {
  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  requestedCheckInAt?: string;

  @IsOptional()
  @IsDateString()
  requestedCheckOutAt?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason: string;

  /// Required from FE — must come from /orgchart/approver-candidates.
  @IsUUID()
  approverId: string;
}
