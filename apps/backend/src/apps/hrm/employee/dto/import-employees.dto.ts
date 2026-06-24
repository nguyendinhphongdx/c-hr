import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkCreateRowDto {
  @IsString()
  employeeCode!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9-_]+$/, {
    message: 'attendanceCode must contain letters, digits, hyphens or underscores only',
  })
  attendanceCode?: string;

  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class BulkCreateEmployeesDto {
  @IsString()
  @MinLength(6)
  defaultPassword!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BulkCreateRowDto)
  rows!: BulkCreateRowDto[];
}

export type ImportRowStatus = 'valid' | 'invalid';

export interface ParsedEmployeeRow {
  rowNumber: number;
  employeeCode: string;
  attendanceCode: string | null;
  email: string;
  name: string;
  title: string | null;
  status: ImportRowStatus;
  errors: string[];
}

export interface EmployeeImportParseResponse {
  rows: ParsedEmployeeRow[];
  summary: { total: number; valid: number; invalid: number };
}

export interface EmployeeImportBulkResponse {
  created: number;
  failed: { rowNumber: number | null; email: string; reason: string }[];
}
