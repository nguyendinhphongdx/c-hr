import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * Period query for the org-wide timesheet report. Both bounds inclusive
 * on the day; service expands them into a [from 00:00, to 23:59] window
 * in the org's timezone.
 *
 * Range is bounded server-side at 92 days to keep the aggregation cheap.
 */
export class TimesheetSummaryQueryDto {
  @IsDateString()
  from: string; // YYYY-MM-DD

  @IsDateString()
  to: string; // YYYY-MM-DD

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Type(() => String)
  q?: string;
}
