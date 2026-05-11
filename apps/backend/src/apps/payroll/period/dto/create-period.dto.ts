import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * POST /payroll/periods — HR mở kỳ lương cho 1 tháng. Service generates
 * `monthKey = "${year}-${pad(month, 2)}"` and rejects if a period already
 * exists for the org + monthKey.
 */
export class CreatePeriodDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1023)
  note?: string;
}
