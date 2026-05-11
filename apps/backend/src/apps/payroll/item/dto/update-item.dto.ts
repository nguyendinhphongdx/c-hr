import { RegionTier } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class AllowanceRowDto {
  @IsString()
  @MaxLength(127)
  name!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsBoolean()
  taxable!: boolean;

  @IsBoolean()
  insurable!: boolean;
}

export class DeductionRowDto {
  @IsString()
  @MaxLength(127)
  name!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

/**
 * PATCH /payroll/items/:id — HR override on a single item before the
 * period closes. Service re-runs the calculator for THIS item after
 * the update.
 */
export class UpdateItemDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  dependents?: number;

  @IsOptional()
  @IsEnum(RegionTier)
  region?: RegionTier;

  @IsOptional()
  @IsInt()
  @Min(0)
  standardWorkdays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualWorkdays?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lateMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  earlyLeaveMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  otMinutesWeekday?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  otMinutesWeekend?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  otMinutesHoliday?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllowanceRowDto)
  allowancesJson?: AllowanceRowDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeductionRowDto)
  deductionsJson?: DeductionRowDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1023)
  computeNote?: string | null;
}
