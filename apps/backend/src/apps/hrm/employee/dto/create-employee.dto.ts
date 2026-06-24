import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * "Add staff" — two modes:
 *
 *  - Default: provision a fresh User atomically (email + name + password
 *    required). HR fields (code, dept, title, hireDate) live on the
 *    Employee. Both rows are created in one transaction.
 *  - Link existing: pass `userId` (e.g. the founder who self-registered
 *    before being added as a real employee). Email/name/password are
 *    ignored; the existing User is attached to the new Employee.
 */
export class CreateEmployeeDto {
  /** Required, unique within Org. HR-generated (e.g. "EMP-0001"). */
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9-_]+$/, {
    message: 'code must contain letters, digits, hyphens or underscores only',
  })
  code: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9-_]+$/, {
    message: 'attendanceCode must contain letters, digits, hyphens or underscores only',
  })
  attendanceCode?: string;

  // ── Link-existing-user mode (mutually exclusive with email/name/password) ─

  @IsOptional()
  @IsUUID()
  userId?: string;

  // ── New-user mode: required only when `userId` is not set ─────────

  @ValidateIf((o) => !o.userId)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ValidateIf((o) => !o.userId)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ValidateIf((o) => !o.userId)
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;

  // ── Employee fields ──────────────────────────────────────────────

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;
}
