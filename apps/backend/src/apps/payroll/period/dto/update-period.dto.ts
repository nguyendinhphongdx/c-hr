import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * PATCH /payroll/periods/:id — only the human-readable note is editable
 * on the period header. Item-level overrides go via PayrollItemService.
 */
export class UpdatePeriodDto {
  @IsOptional()
  @IsString()
  @MaxLength(1023)
  note?: string | null;
}
