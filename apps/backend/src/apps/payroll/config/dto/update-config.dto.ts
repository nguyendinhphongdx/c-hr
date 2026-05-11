import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * PATCH /payroll/config — admin-only. Fields omitted stay unchanged.
 *
 * JSON shapes are validated structurally here + semantically (sort order,
 * 0..100 rate range) in `PayrollConfigService.update`. We accept numbers
 * for Decimal columns; the service casts them via `Prisma.Decimal`.
 */
export class UpdateConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  personalDeduction?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dependentDeduction?: number;

  @IsOptional()
  @IsObject()
  regionMinWageJson?: {
    REGION_I: number;
    REGION_II: number;
    REGION_III: number;
    REGION_IV: number;
  };

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceCapMultiplier?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bhxhRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bhytRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bhtnRate?: number;

  @IsOptional()
  @IsObject()
  otRatesJson?: {
    weekday: number;
    weekend: number;
    holiday: number;
    night: number;
  };

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxBracketDto)
  taxBracketsJson?: TaxBracketDto[];
}

export class TaxBracketDto {
  /** Upper bound (inclusive). null = open-ended last bracket. */
  @IsOptional()
  @IsNumber()
  upto?: number | null;

  /** Marginal rate as decimal (0.05 = 5%). */
  @IsNumber()
  rate!: number;
}
