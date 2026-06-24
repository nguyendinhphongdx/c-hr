import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export enum AttendanceEventType {
  IN = 'IN',
  OUT = 'OUT',
}

export class AttendanceEventDto {
  /** Device's internal id for this event — used to dedupe replays. */
  @IsString()
  @MaxLength(100)
  eventLogId: string;

  /** Employee.attendanceCode matching a row within the same Org. */
  @IsString()
  @MaxLength(50)
  employeeCode: string;

  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsEnum(AttendanceEventType)
  type?: AttendanceEventType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class PushAttendanceDto {
  /**
   * Plaintext token from create / regenerate. Server resolves the device by
   * SHA-256(token) lookup, then verifies via bcrypt — no separate deviceId
   * field is needed. Tokens are random 256-bit so collision is negligible.
   */
  @IsString()
  @MaxLength(255)
  token: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEventDto)
  events: AttendanceEventDto[];
}
