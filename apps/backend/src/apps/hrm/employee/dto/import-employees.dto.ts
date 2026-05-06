import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkCreateRowDto {
  @IsString()
  employeeCode!: string;

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
