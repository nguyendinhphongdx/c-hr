import { EmployeeStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
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
}
