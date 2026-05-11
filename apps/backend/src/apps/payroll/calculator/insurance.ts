import type { ConfigSnapshot, Region } from './types';

export interface InsuranceInput {
  insurableBaseUnclamped: number;
  region: Region;
  config: ConfigSnapshot;
}

export interface InsuranceOutput {
  /** After clamp to cap. */
  insurableBase: number;
  bhxhEmployee: number;
  bhytEmployee: number;
  bhtnEmployee: number;
  insuranceTotal: number;
}

/**
 * Compute NLĐ-side insurance trừ. Cap = capMultiplier × regionMinWage.
 * Vietnamese payroll convention: amounts are integer VND — round each
 * sub-amount to nearest whole đồng.
 */
export function computeInsurance(input: InsuranceInput): InsuranceOutput {
  const { insurableBaseUnclamped, region, config } = input;
  const minWage = config.regionMinWage[region];
  const cap = config.insuranceCapMultiplier * minWage;
  const insurableBase = Math.min(insurableBaseUnclamped, cap);

  const bhxhEmployee = roundVnd((insurableBase * config.bhxhRate) / 100);
  const bhytEmployee = roundVnd((insurableBase * config.bhytRate) / 100);
  const bhtnEmployee = roundVnd((insurableBase * config.bhtnRate) / 100);
  const insuranceTotal = bhxhEmployee + bhytEmployee + bhtnEmployee;

  return {
    insurableBase: roundVnd(insurableBase),
    bhxhEmployee,
    bhytEmployee,
    bhtnEmployee,
    insuranceTotal,
  };
}

function roundVnd(n: number): number {
  return Math.round(n);
}
