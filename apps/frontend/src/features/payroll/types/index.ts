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

// ──────────────────────────────────────────────────────────────────
// Period + Item (Phase 3 additions)
// ──────────────────────────────────────────────────────────────────

export type PayrollStatus = "DRAFT" | "CLOSED" | "PAID";

export interface AllowanceRow {
  name: string;
  amount: number;
  taxable: boolean;
  insurable: boolean;
}

export interface DeductionRow {
  name: string;
  amount: number;
  note?: string;
}

export interface PayrollEmployeeSummary {
  id: ID;
  code: string;
  user: Nullable<{
    id: ID;
    name: Nullable<string>;
    email: string;
    avatar: Nullable<string>;
  }>;
  department: Nullable<{ id: ID; name: string }>;
}

/** Row shape from `list()` — periods grouped by org, includes `_count.items`. */
export interface PayrollPeriodRow {
  id: ID;
  organizationId: ID;
  monthKey: string;
  year: number;
  month: number;
  status: PayrollStatus;
  closedAt: Nullable<ISODate>;
  paidAt: Nullable<ISODate>;
  note: Nullable<string>;
  createdById: ID;
  closedById: Nullable<ID>;
  paidById: Nullable<ID>;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Server-side aggregate, decorated by the service layer. */
  totalNetPay: number;
  _count?: { items: number };
}

/** Detail shape from `get()` / mutations — period header + items + view ACL. */
export interface PayrollPeriodDetail extends PayrollPeriodRow {
  items?: PayrollItemRow[];
  view?: {
    canView: boolean;
    canEdit: boolean;
    canClose: boolean;
    canPay: boolean;
    canReopen: boolean;
    canDelete: boolean;
  };
  /** Present on the create() response — list of employee codes skipped because they have no baseSalary. */
  meta?: { skippedEmployees?: string[] };
}

export interface CreatePeriodInput {
  year: number;
  month: number;
  note?: string;
}

export interface UpdatePeriodInput {
  note?: string;
}

/** One PayrollItem row (one employee × one period). Decimal columns arrive as strings. */
export interface PayrollItemRow {
  id: ID;
  organizationId: ID;
  periodId: ID;
  employeeId: ID;
  employee: PayrollEmployeeSummary;
  period?: {
    id: ID;
    status: PayrollStatus;
    monthKey: string;
    year: number;
    month: number;
  };
  baseSalary: string;
  dependents: number;
  region: Region;
  standardWorkdays: number;
  actualWorkdays: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  otMinutesWeekday: number;
  otMinutesWeekend: number;
  otMinutesHoliday: number;
  allowancesJson: AllowanceRow[];
  deductionsJson: DeductionRow[];
  grossIncome: string;
  insurableBase: string;
  bhxhEmployee: string;
  bhytEmployee: string;
  bhtnEmployee: string;
  insuranceTotal: string;
  taxableIncome: string;
  taxAmount: string;
  netPay: string;
  computeNote: Nullable<string>;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type PayrollItemDetail = PayrollItemRow & {
  view?: {
    canView: boolean;
    canEdit: boolean;
  };
};

export interface UpdateItemInput {
  baseSalary?: number;
  dependents?: number;
  region?: Region;
  standardWorkdays?: number;
  actualWorkdays?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  otMinutesWeekday?: number;
  otMinutesWeekend?: number;
  otMinutesHoliday?: number;
  allowancesJson?: AllowanceRow[];
  deductionsJson?: DeductionRow[];
  computeNote?: string | null;
}

export interface ListPeriodsQuery {
  year?: number;
  status?: PayrollStatus;
}

export interface ListItemsQuery {
  departmentId?: ID;
  q?: string;
}

export type { Nullable };
