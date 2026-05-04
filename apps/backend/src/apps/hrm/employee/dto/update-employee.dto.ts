import { EmployeeStatus, Gender } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

// Global ValidationPipe has `enableImplicitConversion: true`, which would
// otherwise coerce null → "null" for `string` fields and break IsUUID /
// IsDateString. Keep null as null so IsOptional skips validation.
const passThrough = ({ value }: { value: unknown }) => value;

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
  @Transform(passThrough)
  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @Transform(passThrough)
  @IsOptional()
  @IsDateString()
  dob?: string | null;

  @Transform(passThrough)
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @Transform(passThrough)
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

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
}
