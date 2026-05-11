/**
 * Pure-function payroll calculator types.
 *
 * No NestJS / Prisma imports here on purpose — these functions must be
 * unit-testable in isolation. `Region` mirrors the Prisma `RegionTier`
 * enum but is duplicated as a plain string union to keep the calculator
 * stack standalone (consumers do the string<->enum cast at the boundary).
 */

export type Region = 'REGION_I' | 'REGION_II' | 'REGION_III' | 'REGION_IV';

export interface OtRates {
  weekday: number;
  weekend: number;
  holiday: number;
  /** Night-shift premium — reserved for v2 compute, not used yet. */
  night: number;
}

export interface TaxBracket {
  /** Upper bound (inclusive). null = open-ended last bracket. */
  upto: number | null;
  /** Marginal rate as decimal (0.05 = 5%). */
  rate: number;
}

export interface ConfigSnapshot {
  personalDeduction: number;
  dependentDeduction: number;
  regionMinWage: Record<Region, number>;
  insuranceCapMultiplier: number;
  /** Percent (8 = 8%, NOT 0.08). */
  bhxhRate: number;
  bhytRate: number;
  bhtnRate: number;
  otRates: OtRates;
  taxBrackets: TaxBracket[];
}

export interface AllowanceRow {
  name: string;
  amount: number;
  /** Counted toward taxable income? */
  taxable: boolean;
  /** Counted toward insurable base? Rare in practice. */
  insurable: boolean;
}

export interface DeductionRow {
  name: string;
  amount: number;
  note?: string;
}

export interface CalcInput {
  baseSalary: number;
  region: Region;
  dependents: number;
  /** Decimal — half-day OK. */
  standardWorkdays: number;
  actualWorkdays: number;
  /** Minutes worked beyond shift end, split by bucket. */
  otMinutesWeekday: number;
  otMinutesWeekend: number;
  otMinutesHoliday: number;
  allowances: AllowanceRow[];
  deductions: DeductionRow[];
  config: ConfigSnapshot;
}

export interface CalcOutput {
  /** Lương theo công = baseSalary × (actualWorkdays / standardWorkdays). */
  workPay: number;
  /** Sum of OT-bucket × rate × hourly-rate. */
  otPay: number;
  /** Sum of all allowance.amount. */
  totalAllowances: number;
  /** Sum of allowances where taxable === true. */
  taxableAllowances: number;
  /** Sum of allowances where insurable === true (rare in practice). */
  insurableAllowances: number;
  /** Gross income = workPay + otPay + totalAllowances. */
  grossIncome: number;
  /** insurableBase = clamp(baseSalary + insurableAllowances, cap). */
  insurableBase: number;
  bhxhEmployee: number;
  bhytEmployee: number;
  bhtnEmployee: number;
  insuranceTotal: number;
  /** Giảm trừ gia cảnh tổng = personal + dependents × dependentDeduction. */
  personalAndDependentDeduction: number;
  /** taxableIncome = workPay + otPay + taxableAllowances − insurance − personalDeduction. Clamped ≥ 0. */
  taxableIncome: number;
  taxAmount: number;
  /** netPay = grossIncome − insuranceTotal − taxAmount − sum(deductions). Clamped ≥ 0. */
  netPay: number;
}
