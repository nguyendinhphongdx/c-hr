import { IsDateString, IsUUID } from 'class-validator';

export class ListLogsQueryDto {
  @IsUUID()
  employeeId: string;

  /** Inclusive — "YYYY-MM-DD" (the row's date column). */
  @IsDateString()
  from: string;

  /** Inclusive. */
  @IsDateString()
  to: string;
}
