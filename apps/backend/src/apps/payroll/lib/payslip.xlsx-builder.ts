import * as XLSX from 'xlsx';

export interface PayslipPayload {
  period: { monthKey: string; year: number; month: number; status: string };
  org: { name: string | null };
  generatedBy: string | null;

  employee: {
    code: string;
    name: string | null;
    email: string | null;
    department: string | null;
    title: string | null;
    taxCode: string | null;
    bhxhCode: string | null;
    dependents: number;
    region: 'REGION_I' | 'REGION_II' | 'REGION_III' | 'REGION_IV';
  };

  baseSalary: number;
  standardWorkdays: number;
  actualWorkdays: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  otMinutesWeekday: number;
  otMinutesWeekend: number;
  otMinutesHoliday: number;
  allowances: Array<{
    name: string;
    amount: number;
    taxable: boolean;
    insurable: boolean;
  }>;
  deductions: Array<{ name: string; amount: number; note?: string | null }>;
  grossIncome: number;
  insurableBase: number;
  bhxhEmployee: number;
  bhytEmployee: number;
  bhtnEmployee: number;
  insuranceTotal: number;
  taxableIncome: number;
  taxAmount: number;
  netPay: number;
  computeNote: string | null;
}

const REGION_LABEL: Record<PayslipPayload['employee']['region'], string> = {
  REGION_I: 'Vùng I',
  REGION_II: 'Vùng II',
  REGION_III: 'Vùng III',
  REGION_IV: 'Vùng IV',
};

const VND_FMT = '#,##0';

/** XLSX sheet-name spec: max 31 chars, none of `: \ / ? * [ ]`. */
function sanitizeSheetName(name: string): string {
  return name.replace(/[:\\/\\?*\[\]]/g, '_').slice(0, 31) || 'Sheet';
}

/**
 * Stamp a number cell with VND format. Mutates in place — keeps the call-site
 * one-liner at the cell coordinate. Skip when cell is missing (header rows).
 */
function fmtCurrency(sheet: XLSX.WorkSheet, addr: string) {
  const cell = sheet[addr] as XLSX.CellObject | undefined;
  if (cell && cell.t === 'n') {
    cell.z = VND_FMT;
  }
}

/**
 * Build the AOA + collect (rowIdx, colIdx) of currency cells so the caller can
 * apply the VND format. Returns 1 sheet ready to be appended to a workbook.
 */
function buildSingleSheet(p: PayslipPayload): XLSX.WorkSheet {
  const aoa: (string | number | null)[][] = [];
  const currencyCells: { r: number; c: number }[] = [];
  const merges: XLSX.Range[] = [];

  const pushRow = (row: (string | number | null)[]) => aoa.push(row);
  const markCurrency = (r: number, c: number) => currencyCells.push({ r, c });

  // Header
  pushRow([p.org.name ?? '—']);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });

  pushRow([`PHIẾU LƯƠNG THÁNG ${p.period.month}/${p.period.year}`]);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });

  pushRow([]);

  // Employee block
  pushRow(['Mã NV:', p.employee.code, '', 'Họ tên:', p.employee.name ?? '—']);
  pushRow([
    'Phòng ban:',
    p.employee.department ?? '—',
    '',
    'Chức vụ:',
    p.employee.title ?? '—',
  ]);
  pushRow([
    'MST:',
    p.employee.taxCode ?? '—',
    '',
    'Số sổ BHXH:',
    p.employee.bhxhCode ?? '—',
  ]);
  pushRow([
    'Số người phụ thuộc:',
    p.employee.dependents,
    '',
    'Vùng:',
    REGION_LABEL[p.employee.region],
  ]);
  pushRow([]);

  // I. CÔNG
  pushRow(['I. CÔNG']);
  pushRow(['Ngày công chuẩn', p.standardWorkdays]);
  pushRow(['Ngày công thực tế', p.actualWorkdays]);
  pushRow(['Đi muộn (phút)', p.lateMinutes]);
  pushRow(['Về sớm (phút)', p.earlyLeaveMinutes]);
  pushRow(['OT ngày thường (phút)', p.otMinutesWeekday]);
  pushRow(['OT cuối tuần (phút)', p.otMinutesWeekend]);
  pushRow(['OT ngày lễ (phút)', p.otMinutesHoliday]);
  pushRow([]);

  // II. THU NHẬP
  pushRow(['II. THU NHẬP']);
  pushRow(['Lương cơ bản', p.baseSalary]);
  markCurrency(aoa.length - 1, 1);

  for (const a of p.allowances) {
    const label = a.name || 'Phụ cấp';
    pushRow([label, a.amount]);
    markCurrency(aoa.length - 1, 1);
  }
  pushRow(['Cộng (tổng thu nhập)', p.grossIncome]);
  markCurrency(aoa.length - 1, 1);
  pushRow([]);

  // III. CÁC KHOẢN TRỪ
  pushRow(['III. CÁC KHOẢN TRỪ']);
  pushRow(['Lương đóng BHXH', p.insurableBase]);
  markCurrency(aoa.length - 1, 1);
  pushRow(['  BHXH (NLĐ)', p.bhxhEmployee]);
  markCurrency(aoa.length - 1, 1);
  pushRow(['  BHYT (NLĐ)', p.bhytEmployee]);
  markCurrency(aoa.length - 1, 1);
  pushRow(['  BHTN (NLĐ)', p.bhtnEmployee]);
  markCurrency(aoa.length - 1, 1);
  pushRow(['Thu nhập tính thuế', p.taxableIncome]);
  markCurrency(aoa.length - 1, 1);
  pushRow(['Thuế TNCN', p.taxAmount]);
  markCurrency(aoa.length - 1, 1);

  const deductionsTotal = p.deductions.reduce((s, d) => s + d.amount, 0);
  for (const d of p.deductions) {
    const label = d.note ? `${d.name || 'Khấu trừ'} — ${d.note}` : d.name || 'Khấu trừ';
    pushRow([label, d.amount]);
    markCurrency(aoa.length - 1, 1);
  }

  const totalDeductions = p.insuranceTotal + p.taxAmount + deductionsTotal;
  pushRow(['Tổng trừ', totalDeductions]);
  markCurrency(aoa.length - 1, 1);
  pushRow([]);

  // Net pay
  pushRow(['LƯƠNG THỰC LĨNH', p.netPay]);
  const netRowIdx = aoa.length - 1;
  markCurrency(netRowIdx, 1);
  pushRow([]);

  pushRow(['Ghi chú:', p.computeNote ?? '—']);
  pushRow([]);

  // Signatures
  pushRow(['Người lập (Kế toán)', '', '', 'Người nhận', '']);
  pushRow(['', '', '', '', '']);
  pushRow(['(Ký, ghi rõ họ tên)', '', '', '(Ký, ghi rõ họ tên)', '']);
  pushRow([]);

  const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  pushRow([`Xuất bởi: ${p.generatedBy ?? '—'} @ ${stamp}`]);

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  for (const cc of currencyCells) {
    fmtCurrency(sheet, XLSX.utils.encode_cell({ r: cc.r, c: cc.c }));
  }

  sheet['!merges'] = merges;
  sheet['!cols'] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 2 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
  ];

  return sheet;
}

/** Single-sheet payslip workbook — used by the per-item endpoint. */
export function buildPayslipXlsx(payload: PayslipPayload): Buffer {
  const wb = XLSX.utils.book_new();
  const sheet = buildSingleSheet(payload);
  XLSX.utils.book_append_sheet(wb, sheet, sanitizeSheetName(payload.employee.code));
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Workbook with a summary sheet at index 0 and one detail sheet per item.
 * Sheet names use employee.code, sanitized + de-duplicated (rare but possible
 * if two codes truncate to the same 31-char prefix).
 */
export function buildBulkPayslipsXlsx(args: {
  org: { name: string | null };
  generatedBy: string | null;
  period: { monthKey: string; year: number; month: number; status: string };
  items: PayslipPayload[];
}): Buffer {
  const { org, period, items } = args;
  const wb = XLSX.utils.book_new();

  // Summary
  const summary: (string | number)[][] = [
    [`${org.name ?? '—'} — Bảng lương tổng hợp tháng ${period.monthKey}`],
    [],
    ['Mã NV', 'Họ tên', 'Phòng ban', 'Gross', 'Bảo hiểm', 'Thuế', 'Khấu trừ', 'Net'],
  ];

  let sumGross = 0;
  let sumIns = 0;
  let sumTax = 0;
  let sumDeduct = 0;
  let sumNet = 0;

  for (const it of items) {
    const deduct = it.deductions.reduce((s, d) => s + d.amount, 0);
    summary.push([
      it.employee.code,
      it.employee.name ?? '—',
      it.employee.department ?? '—',
      it.grossIncome,
      it.insuranceTotal,
      it.taxAmount,
      deduct,
      it.netPay,
    ]);
    sumGross += it.grossIncome;
    sumIns += it.insuranceTotal;
    sumTax += it.taxAmount;
    sumDeduct += deduct;
    sumNet += it.netPay;
  }

  summary.push(['Tổng cộng', '', '', sumGross, sumIns, sumTax, sumDeduct, sumNet]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  summarySheet['!cols'] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
  ];
  // Format the 5 currency columns (D..H) for every data row + totals row.
  const headerRowIdx = 2;
  const lastRowIdx = headerRowIdx + items.length + 1;
  for (let r = headerRowIdx + 1; r <= lastRowIdx; r++) {
    for (let c = 3; c <= 7; c++) {
      fmtCurrency(summarySheet, XLSX.utils.encode_cell({ r, c }));
    }
  }
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Tổng hợp');

  // De-dup sheet names — codes are unique per org, but their 31-char prefix
  // may collide. Suffix the collision with `-2`, `-3`…
  const used = new Set<string>(['Tổng hợp']);
  for (const item of items) {
    let name = sanitizeSheetName(item.employee.code);
    let i = 2;
    while (used.has(name)) {
      const suffix = `-${i}`;
      name = sanitizeSheetName(item.employee.code.slice(0, 31 - suffix.length) + suffix);
      i++;
    }
    used.add(name);
    XLSX.utils.book_append_sheet(wb, buildSingleSheet(item), name);
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
