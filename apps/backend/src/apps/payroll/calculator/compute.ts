import { summarizeAllowances } from './allowance';
import { computeInsurance } from './insurance';
import { computeOtPay } from './ot';
import { computeProgressiveTax } from './tax';
import type { CalcInput, CalcOutput } from './types';

/**
 * Orchestrate full payroll computation for a single (employee, period).
 * Pure function — no DB, no Nest DI. Caller resolves config + maps DTO
 * shape to `CalcInput` at the boundary.
 *
 * Vietnamese payroll convention: all intermediate values rounded to whole
 * VND. The sub-functions already round; this orchestrator just sums.
 */
export function computePayroll(input: CalcInput): CalcOutput {
  const {
    baseSalary,
    region,
    dependents,
    standardWorkdays,
    actualWorkdays,
    otMinutesWeekday,
    otMinutesWeekend,
    otMinutesHoliday,
    allowances,
    deductions,
    config,
  } = input;

  if (baseSalary <= 0) {
    return {
      workPay: 0,
      otPay: 0,
      totalAllowances: 0,
      taxableAllowances: 0,
      insurableAllowances: 0,
      grossIncome: 0,
      insurableBase: 0,
      bhxhEmployee: 0,
      bhytEmployee: 0,
      bhtnEmployee: 0,
      insuranceTotal: 0,
      personalAndDependentDeduction: 0,
      taxableIncome: 0,
      taxAmount: 0,
      netPay: 0,
    };
  }

  // Work pay = base × actualWorkdays / standardWorkdays. We do NOT cap the
  // ratio at 1 — if HR records 23 days against 22 standard (e.g. a Sat
  // make-up day) the extra day counts. OT minutes are tracked separately.
  const ratio = standardWorkdays > 0 ? actualWorkdays / standardWorkdays : 0;
  const workPay = Math.round(baseSalary * ratio);

  const otPay = computeOtPay({
    baseSalary,
    standardWorkdays,
    otMinutesWeekday,
    otMinutesWeekend,
    otMinutesHoliday,
    rates: config.otRates,
  });

  const allowanceSummary = summarizeAllowances(allowances);

  const grossIncome = workPay + otPay + allowanceSummary.total;

  const insurableBaseUnclamped = baseSalary + allowanceSummary.insurable;
  const insurance = computeInsurance({ insurableBaseUnclamped, region, config });

  const personalAndDependentDeduction =
    config.personalDeduction + dependents * config.dependentDeduction;

  const taxableIncomeRaw =
    workPay +
    otPay +
    allowanceSummary.taxable -
    insurance.insuranceTotal -
    personalAndDependentDeduction;
  const taxableIncome = Math.max(0, Math.round(taxableIncomeRaw));

  const taxAmount = computeProgressiveTax(taxableIncome, config.taxBrackets);

  const totalDeductions = deductions.reduce((acc, d) => acc + d.amount, 0);
  const netPay = Math.max(
    0,
    Math.round(grossIncome - insurance.insuranceTotal - taxAmount - totalDeductions),
  );

  return {
    workPay,
    otPay,
    totalAllowances: allowanceSummary.total,
    taxableAllowances: allowanceSummary.taxable,
    insurableAllowances: allowanceSummary.insurable,
    grossIncome,
    insurableBase: insurance.insurableBase,
    bhxhEmployee: insurance.bhxhEmployee,
    bhytEmployee: insurance.bhytEmployee,
    bhtnEmployee: insurance.bhtnEmployee,
    insuranceTotal: insurance.insuranceTotal,
    personalAndDependentDeduction,
    taxableIncome,
    taxAmount,
    netPay,
  };
}
