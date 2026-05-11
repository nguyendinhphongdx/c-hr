import type { OtRates } from './types';

export interface OtInput {
  baseSalary: number;
  standardWorkdays: number;
  otMinutesWeekday: number;
  otMinutesWeekend: number;
  otMinutesHoliday: number;
  rates: OtRates;
}

/**
 * Hourly rate = baseSalary / (standardWorkdays × 8). 8 hours/day is the
 * VN labor-code default; if HR wants 7.5 they can override per Org later.
 *
 * Edge cases:
 *   - standardWorkdays <= 0 → 0 (avoid div-by-zero).
 *   - baseSalary <= 0      → 0.
 */
export function computeOtPay(input: OtInput): number {
  const {
    baseSalary,
    standardWorkdays,
    otMinutesWeekday,
    otMinutesWeekend,
    otMinutesHoliday,
    rates,
  } = input;
  if (baseSalary <= 0 || standardWorkdays <= 0) return 0;

  const hourlyRate = baseSalary / (standardWorkdays * 8);
  const pay =
    (otMinutesWeekday / 60) * hourlyRate * rates.weekday +
    (otMinutesWeekend / 60) * hourlyRate * rates.weekend +
    (otMinutesHoliday / 60) * hourlyRate * rates.holiday;

  return Math.round(pay);
}
