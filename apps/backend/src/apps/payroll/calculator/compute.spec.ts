import { computePayroll } from './compute';
import { computeInsurance } from './insurance';
import type { CalcInput, ConfigSnapshot } from './types';

const VN_2024_CONFIG: ConfigSnapshot = {
  personalDeduction: 11_000_000,
  dependentDeduction: 4_400_000,
  regionMinWage: {
    REGION_I: 4_960_000,
    REGION_II: 4_410_000,
    REGION_III: 3_860_000,
    REGION_IV: 3_450_000,
  },
  insuranceCapMultiplier: 20,
  bhxhRate: 8,
  bhytRate: 1.5,
  bhtnRate: 1,
  otRates: { weekday: 1.5, weekend: 2.0, holiday: 3.0, night: 1.3 },
  taxBrackets: [
    { upto: 5_000_000, rate: 0.05 },
    { upto: 10_000_000, rate: 0.1 },
    { upto: 18_000_000, rate: 0.15 },
    { upto: 32_000_000, rate: 0.2 },
    { upto: 52_000_000, rate: 0.25 },
    { upto: 80_000_000, rate: 0.3 },
    { upto: null, rate: 0.35 },
  ],
};

function baseInput(overrides: Partial<CalcInput> = {}): CalcInput {
  return {
    baseSalary: 22_000_000,
    region: 'REGION_I',
    dependents: 1,
    standardWorkdays: 22,
    actualWorkdays: 22,
    otMinutesWeekday: 0,
    otMinutesWeekend: 0,
    otMinutesHoliday: 0,
    allowances: [{ name: 'Cơm trưa', amount: 1_000_000, taxable: false, insurable: false }],
    deductions: [],
    config: VN_2024_CONFIG,
    ...overrides,
  };
}

describe('computePayroll', () => {
  it('full-time engineer: 22M base, 22/22 days, 1 dependent, 1M non-taxable lunch', () => {
    // Hand math:
    //   workPay        = 22_000_000 * 22/22 = 22_000_000
    //   otPay          = 0
    //   allowances     = 1_000_000 (taxable=false, insurable=false)
    //   gross          = 22_000_000 + 0 + 1_000_000 = 23_000_000
    //   insurableBase  = 22_000_000 + 0 = 22_000_000  (cap = 20 * 4_960_000 = 99_200_000, OK)
    //   bhxh           = 22_000_000 * 8%   = 1_760_000
    //   bhyt           = 22_000_000 * 1.5% =   330_000
    //   bhtn           = 22_000_000 * 1%   =   220_000
    //   insurance      = 2_310_000
    //   pers + dep     = 11_000_000 + 1*4_400_000 = 15_400_000
    //   taxableIncome  = 22_000_000 + 0 + 0 - 2_310_000 - 15_400_000 = 4_290_000
    //                    (lunch allowance is taxable=false so NOT added)
    //   tax (bracket 1 only, <5M @ 5%) = 4_290_000 * 0.05 = 214_500 → round 214_500
    //   netPay         = 23_000_000 - 2_310_000 - 214_500 - 0 = 20_475_500
    const out = computePayroll(baseInput());
    expect(out.workPay).toBe(22_000_000);
    expect(out.otPay).toBe(0);
    expect(out.totalAllowances).toBe(1_000_000);
    expect(out.taxableAllowances).toBe(0);
    expect(out.insurableAllowances).toBe(0);
    expect(out.grossIncome).toBe(23_000_000);
    expect(out.insurableBase).toBe(22_000_000);
    expect(out.bhxhEmployee).toBe(1_760_000);
    expect(out.bhytEmployee).toBe(330_000);
    expect(out.bhtnEmployee).toBe(220_000);
    expect(out.insuranceTotal).toBe(2_310_000);
    expect(out.personalAndDependentDeduction).toBe(15_400_000);
    expect(out.taxableIncome).toBe(4_290_000);
    expect(out.taxAmount).toBe(214_500);
    expect(out.netPay).toBe(20_475_500);
  });

  it('baseSalary 0 → all outputs 0', () => {
    const out = computePayroll(baseInput({ baseSalary: 0 }));
    expect(out.workPay).toBe(0);
    expect(out.otPay).toBe(0);
    expect(out.grossIncome).toBe(0);
    expect(out.insuranceTotal).toBe(0);
    expect(out.taxAmount).toBe(0);
    expect(out.netPay).toBe(0);
  });

  it('actualWorkdays > standardWorkdays → workPay scales linearly (no cap)', () => {
    // 23 days worked vs 22 standard → ratio 23/22 ≈ 1.04545
    // workPay = round(22_000_000 * 23/22) = round(23_000_000) = 23_000_000
    const out = computePayroll(
      baseInput({ standardWorkdays: 22, actualWorkdays: 23, allowances: [] }),
    );
    expect(out.workPay).toBe(23_000_000);
    expect(out.totalAllowances).toBe(0);
  });

  it('insurable base exceeds cap → BHXH clamped to cap × rate', () => {
    // baseSalary 200M in REGION_I. cap = 20 * 4_960_000 = 99_200_000.
    // bhxh = 99_200_000 * 8% = 7_936_000 (NOT 16M).
    const out = computeInsurance({
      insurableBaseUnclamped: 200_000_000,
      region: 'REGION_I',
      config: VN_2024_CONFIG,
    });
    expect(out.insurableBase).toBe(99_200_000);
    expect(out.bhxhEmployee).toBe(7_936_000);
    expect(out.bhytEmployee).toBe(1_488_000);
    expect(out.bhtnEmployee).toBe(992_000);
    expect(out.insuranceTotal).toBe(7_936_000 + 1_488_000 + 992_000);
  });

  it('OT pay: 10h weekday OT on 22M base / 22 std days', () => {
    // hourly = 22_000_000 / (22*8) = 125_000
    // otPay = (600/60) * 125_000 * 1.5 = 10 * 125_000 * 1.5 = 1_875_000
    const out = computePayroll(
      baseInput({
        otMinutesWeekday: 600,
        allowances: [],
      }),
    );
    expect(out.otPay).toBe(1_875_000);
  });
});
