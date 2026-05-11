import * as XLSX from 'xlsx';

import type { EmployeeSummaryRow } from '../timesheet-report.service';

interface BuildArgs {
  rows: EmployeeSummaryRow[];
  period: { from: string; to: string };
  orgName: string | null;
  generatedBy: string | null;
}

/**
 * Format minutes as `HhMM` for human reading. 0 → empty cell so totals
 * column doesn't visually clutter.
 */
function fmtHm(minutes: number): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Builds a single-sheet xlsx report buffer matching the on-screen
 * "Theo nhân sự" table. v1 keeps it flat — Phase 7 may add a per-
 * employee detail sheet.
 */
export function buildTimesheetReportXlsx(args: BuildArgs): Buffer {
  const { rows, period, orgName, generatedBy } = args;

  const headerRows: (string | number)[][] = [
    [orgName ?? 'Báo cáo chấm công'],
    [`Kỳ: ${period.from} → ${period.to}`],
    [generatedBy ? `Xuất bởi: ${generatedBy}` : ''],
    [`Xuất lúc: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`],
    [],
  ];

  const tableHeader = [
    'Mã NV',
    'Họ tên',
    'Email',
    'Phòng ban',
    'Ngày công thực tế',
    'Ngày công chuẩn',
    'Giờ công',
    'Đi muộn (lần)',
    'Đi muộn (giờ)',
    'Về sớm (lần)',
    'Về sớm (giờ)',
    'Vắng',
    'OT (giờ)',
    'Giờ làm theo project',
    'Chuyên cần',
  ];

  const tableRows = rows.map((r) => [
    r.code,
    r.name ?? '',
    r.email ?? '',
    r.departmentName ?? '',
    r.actualWorkdays,
    r.standardWorkdays,
    fmtHm(r.totalWorkMinutes),
    r.lateCount,
    fmtHm(r.lateMinutes),
    r.earlyLeaveCount,
    fmtHm(r.earlyLeaveMinutes),
    r.absentDays,
    fmtHm(r.otMinutes),
    fmtHm(r.workMinutes),
    `${(r.attendanceRate * 100).toFixed(1)}%`,
  ]);

  // Footer totals — sums of countable columns; ratio cells left blank.
  const totalsRow: (string | number)[] = [
    'Tổng',
    '',
    '',
    '',
    rows.reduce((s, r) => s + r.actualWorkdays, 0),
    rows.reduce((s, r) => s + r.standardWorkdays, 0),
    fmtHm(rows.reduce((s, r) => s + r.totalWorkMinutes, 0)),
    rows.reduce((s, r) => s + r.lateCount, 0),
    fmtHm(rows.reduce((s, r) => s + r.lateMinutes, 0)),
    rows.reduce((s, r) => s + r.earlyLeaveCount, 0),
    fmtHm(rows.reduce((s, r) => s + r.earlyLeaveMinutes, 0)),
    rows.reduce((s, r) => s + r.absentDays, 0),
    fmtHm(rows.reduce((s, r) => s + r.otMinutes, 0)),
    fmtHm(rows.reduce((s, r) => s + r.workMinutes, 0)),
    '',
  ];

  const aoa: (string | number)[][] = [...headerRows, tableHeader, ...tableRows, totalsRow];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  // Column widths picked for VN names + email length.
  sheet['!cols'] = [
    { wch: 12 },
    { wch: 24 },
    { wch: 28 },
    { wch: 18 },
    { wch: 8 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
    { wch: 6 },
    { wch: 8 },
    { wch: 14 },
    { wch: 10 },
  ];
  // Freeze header rows + first 2 columns so HR can scroll wide.
  sheet['!freeze'] = { ySplit: headerRows.length + 1, xSplit: 2 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Theo nhân sự');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
