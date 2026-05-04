import { EmployeeStatus, Gender } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  /** Pass null to detach from a department. */
  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsDateString()
  dob?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string | null;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsDateString()
  hireDate?: string | null;

  /** Set when offboarding; pair with status=TERMINATED. */
  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsDateString()
  terminationDate?: string | null;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}
