import type { TaxBracket } from './types';

/**
 * Vietnamese progressive PIT — marginal brackets. For income X:
 *   for each bracket b in ascending order
 *     slice = min(X, b.upto) - previousUpto
 *     if slice <= 0 break
 *     tax += slice * b.rate
 *
 * The final bracket may have `upto: null` (open-ended).
 *
 * Edge cases:
 *   - X <= 0 → 0
 *   - Empty brackets → 0  // TODO surface a config error instead
 *
 * Result rounded to whole VND (Vietnamese payroll convention).
 */
export function computeProgressiveTax(taxableIncome: number, brackets: TaxBracket[]): number {
  if (taxableIncome <= 0) return 0;
  if (brackets.length === 0) return 0;

  let tax = 0;
  let prevUpto = 0;

  for (const b of brackets) {
    const ceiling = b.upto == null ? taxableIncome : Math.min(taxableIncome, b.upto);
    const slice = ceiling - prevUpto;
    if (slice <= 0) break;
    tax += slice * b.rate;
    if (b.upto == null || taxableIncome <= b.upto) break;
    prevUpto = b.upto;
  }

  return Math.round(tax);
}
