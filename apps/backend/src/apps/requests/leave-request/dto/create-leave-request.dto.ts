import { LeaveType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLeaveRequestDto {
  @IsEnum(LeaveType)
  type: LeaveType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  /// Required from FE — must come from /orgchart/approver-candidates.
  /// Service re-validates the id is in the current candidates list.
  @IsUUID()
  approverId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
