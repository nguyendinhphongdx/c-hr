import type { AllowanceRow } from './types';

export interface AllowanceSummary {
  total: number;
  taxable: number;
  insurable: number;
}

/**
 * Sum allowance rows into 3 buckets — full total + the taxable/insurable
 * subsets. Each row's `taxable` / `insurable` flags decide membership.
 * Values rounded to whole VND (sum of integer rows is already integer,
 * but caller may pass non-integer rates so we round defensively).
 */
export function summarizeAllowances(rows: AllowanceRow[]): AllowanceSummary {
  let total = 0;
  let taxable = 0;
  let insurable = 0;
  for (const r of rows) {
    total += r.amount;
    if (r.taxable) taxable += r.amount;
    if (r.insurable) insurable += r.amount;
  }
  return {
    total: Math.round(total),
    taxable: Math.round(taxable),
    insurable: Math.round(insurable),
  };
}
