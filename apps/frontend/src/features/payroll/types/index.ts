import type { ID, ISODate, Nullable } from "@/lib/types";

export type Region = "REGION_I" | "REGION_II" | "REGION_III" | "REGION_IV";

export interface RegionMinWage {
  REGION_I: number;
  REGION_II: number;
  REGION_III: number;
  REGION_IV: number;
}

export interface OtRates {
  weekday: number;
  weekend: number;
  holiday: number;
  night: number;
}

export interface TaxBracket {
  /** Upper bound (inclusive). null = open-ended last bracket. */
  upto: number | null;
  /** Marginal rate as decimal (0.05 = 5%). */
  rate: number;
}

/**
 * Prisma serializes Decimal columns as strings on the wire (preserves
 * precision). FE keeps them as strings until display/edit, then parses.
 */
export interface PayrollConfig {
  id: ID;
  organizationId: ID;
  year: number;
  personalDeduction: string;
  dependentDeduction: string;
  regionMinWageJson: RegionMinWage;
  insuranceCapMultiplier: string;
  bhxhRate: string;
  bhytRate: string;
  bhtnRate: string;
  otRatesJson: OtRates;
  taxBracketsJson: TaxBracket[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface UpdateConfigInput {
  personalDeduction?: number;
  dependentDeduction?: number;
  regionMinWageJson?: RegionMinWage;
  insuranceCapMultiplier?: number;
  bhxhRate?: number;
  bhytRate?: number;
  bhtnRate?: number;
  otRatesJson?: OtRates;
  taxBracketsJson?: TaxBracket[];
}

export type { Nullable };
