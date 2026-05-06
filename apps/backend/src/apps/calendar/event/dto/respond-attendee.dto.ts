import { AttendeeResponse } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class RespondAttendeeDto {
  @IsEnum(AttendeeResponse)
  response!: AttendeeResponse;
}
