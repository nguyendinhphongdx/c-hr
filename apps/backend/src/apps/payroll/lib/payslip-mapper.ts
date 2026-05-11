import { PayrollStatus, Prisma } from '@prisma/client';

import type { AllowanceRow, DeductionRow } from '../calculator';

import type { PayslipPayload } from './payslip.xlsx-builder';

/**
 * Item shape that the mapper needs. Both per-item ACL gate (item service)
 * and bulk export (period service) reuse it. Decimal columns coming in;
 * `.toNumber()` happens here once.
 */
export interface PayslipItemInput {
  organizationId: string;
  employeeId: string;
  baseSalary: Prisma.Decimal;
  dependents: number;
  region: string;
  standardWorkdays: number;
  actualWorkdays: Prisma.Decimal;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  otMinutesWeekday: number;
  otMinutesWeekend: number;
  otMinutesHoliday: number;
  allowancesJson: Prisma.JsonValue;
  deductionsJson: Prisma.JsonValue;
  grossIncome: Prisma.Decimal;
  insurableBase: Prisma.Decimal;
  bhxhEmployee: Prisma.Decimal;
  bhytEmployee: Prisma.Decimal;
  bhtnEmployee: Prisma.Decimal;
  insuranceTotal: Prisma.Decimal;
  taxableIncome: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  netPay: Prisma.Decimal;
  computeNote: string | null;
  employee: {
    code: string;
    department: { name: string } | null;
    user: { name: string | null; email: string } | null;
  };
  period: { monthKey: string; year: number; month: number; status: PayrollStatus };
}

/**
 * Coerce a JSON column to the typed rows used by the calculator/payslip.
 * Tolerant of legacy/empty values — duplicated from `period.service`'s
 * `jsonToAllowances` to avoid an import cycle (mapper sits in `lib/`,
 * services import `lib/`).
 */
function jsonToAllowances(json: Prisma.JsonValue): AllowanceRow[] {
  if (!Array.isArray(json)) return [];
  const out: AllowanceRow[] = [];
  for (const entry of json) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const r = entry as Record<string, unknown>;
      out.push({
        name: String(r.name ?? ''),
        amount: Number(r.amount ?? 0),
        taxable: Boolean(r.taxable ?? false),
        insurable: Boolean(r.insurable ?? false),
      });
    }
  }
  return out;
}

function jsonToDeductions(json: Prisma.JsonValue): DeductionRow[] {
  if (!Array.isArray(json)) return [];
  const out: DeductionRow[] = [];
  for (const entry of json) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const r = entry as Record<string, unknown>;
      out.push({
        name: String(r.name ?? ''),
        amount: Number(r.amount ?? 0),
        note: typeof r.note === 'string' ? r.note : undefined,
      });
    }
  }
  return out;
}

export function itemToPayslipPayload(args: {
  item: PayslipItemInput;
  employeeExtra: { title: string | null; taxCode: string | null; bhxhCode: string | null };
  org: { name: string | null };
  generatedBy: string | null;
}): PayslipPayload {
  const { item, employeeExtra, org, generatedBy } = args;
  return {
    period: {
      monthKey: item.period.monthKey,
      year: item.period.year,
      month: item.period.month,
      status: item.period.status,
    },
    org,
    generatedBy,
    employee: {
      code: item.employee.code,
      name: item.employee.user?.name ?? null,
      email: item.employee.user?.email ?? null,
      department: item.employee.department?.name ?? null,
      title: employeeExtra.title,
      taxCode: employeeExtra.taxCode,
      bhxhCode: employeeExtra.bhxhCode,
      dependents: item.dependents,
      region: item.region as PayslipPayload['employee']['region'],
    },
    baseSalary: item.baseSalary.toNumber(),
    standardWorkdays: item.standardWorkdays,
    actualWorkdays: item.actualWorkdays.toNumber(),
    lateMinutes: item.lateMinutes,
    earlyLeaveMinutes: item.earlyLeaveMinutes,
    otMinutesWeekday: item.otMinutesWeekday,
    otMinutesWeekend: item.otMinutesWeekend,
    otMinutesHoliday: item.otMinutesHoliday,
    allowances: jsonToAllowances(item.allowancesJson),
    deductions: jsonToDeductions(item.deductionsJson),
    grossIncome: item.grossIncome.toNumber(),
    insurableBase: item.insurableBase.toNumber(),
    bhxhEmployee: item.bhxhEmployee.toNumber(),
    bhytEmployee: item.bhytEmployee.toNumber(),
    bhtnEmployee: item.bhtnEmployee.toNumber(),
    insuranceTotal: item.insuranceTotal.toNumber(),
    taxableIncome: item.taxableIncome.toNumber(),
    taxAmount: item.taxAmount.toNumber(),
    netPay: item.netPay.toNumber(),
    computeNote: item.computeNote,
  };
}
