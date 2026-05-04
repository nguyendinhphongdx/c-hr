import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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

  /** Employee.code matching a row within the same Org. */
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
  /** Returned at create-time. The device must include this in every push. */
  @IsUUID()
  deviceId: string;

  /** Plaintext token from create / regenerate. Verified against bcrypt hash. */
  @IsString()
  @MaxLength(255)
  token: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEventDto)
  events: AttendanceEventDto[];
}
