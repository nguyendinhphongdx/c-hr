import { EmployeeStatus, RegionTier } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const passThrough = ({ value }: { value: unknown }) => value;

export class UpdateEmployeeDto {
  /** HR-generated code, unique within the Org. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9-_]+$/, {
    message: 'code must contain letters, digits, hyphens or underscores only',
  })
  code?: string;

  /** Re-link this employee to a different User in this Org. */
  @IsOptional()
  @IsUUID()
  userId?: string;

  /** Pass null to detach from a department. */
  @Transform(passThrough)
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string | null;

  @Transform(passThrough)
  @IsOptional()
  @IsDateString()
  hireDate?: string | null;

  /** Set when offboarding; pair with status=TERMINATED. */
  @Transform(passThrough)
  @IsOptional()
  @IsDateString()
  terminationDate?: string | null;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  // ── Salary / BHXH (F9 Payroll). HRM admin only — gated server-side
  // via EmployeeAcl.canEdit (which the service already checks).
  // Pass null to clear; omit to leave unchanged.

  @Transform(passThrough)
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSalary?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  dependents?: number;

  @IsOptional()
  @IsEnum(RegionTier)
  region?: RegionTier;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'taxCode must be exactly 10 digits' })
  taxCode?: string | null;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bhxhCode?: string | null;
}
