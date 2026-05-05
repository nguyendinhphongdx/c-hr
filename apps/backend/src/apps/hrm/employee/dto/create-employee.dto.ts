import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Atomic "Add staff" — creating an Employee always provisions a fresh
 * User row in the same Org. Personal info (name, email, dob, gender,
 * phone) lives on the User; HR fields (code, dept, title, hireDate) on
 * the Employee. Both rows are created in one transaction.
 *
 * To link an existing User (e.g. the admin founder who signed up before
 * being added as a real employee), use the edit form's user re-link
 * picker instead.
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

  // ── New User fields (created together with Employee) ─────────────

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

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
