import { join } from 'node:path';

import PDFDocument from 'pdfkit';

import type { PayslipPayload } from './payslip.xlsx-builder';

const FONTS_DIR = join(__dirname, 'fonts');
const FONT_REGULAR = join(FONTS_DIR, 'Roboto-Regular.ttf');
const FONT_BOLD = join(FONTS_DIR, 'Roboto-Bold.ttf');

const REGION_LABEL: Record<PayslipPayload['employee']['region'], string> = {
  REGION_I: 'Vùng I',
  REGION_II: 'Vùng II',
  REGION_III: 'Vùng III',
  REGION_IV: 'Vùng IV',
};

const fmtVnd = new Intl.NumberFormat('vi-VN');
const fmt = (n: number) => fmtVnd.format(n);

/**
 * Render a single-payslip A4 PDF mirroring the Excel layout. Uses bundled
 * Roboto TTFs because pdfkit's built-in AFMs (Helvetica/Times) can't render
 * Vietnamese diacritics. Resolves with the full PDF buffer once `end()` fires.
 */
export async function buildPayslipPdf(payload: PayslipPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      doc.registerFont('Regular', FONT_REGULAR);
      doc.registerFont('Bold', FONT_BOLD);
      drawPayslip(doc, payload);
      doc.end();
    } catch (err) {
      reject(err as Error);
    }
  });
}

function drawPayslip(doc: PDFKit.PDFDocument, p: PayslipPayload): void {
  const { page } = doc;
  const pageWidth = page.width;
  const left = page.margins.left;
  const right = pageWidth - page.margins.right;
  const contentWidth = right - left;

  // Header — org + title centered
  doc
    .font('Bold')
    .fontSize(16)
    .text(p.org.name ?? '—', left, doc.y, { width: contentWidth, align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).text(`PHIẾU LƯƠNG THÁNG ${p.period.month}/${p.period.year}`, left, doc.y, {
    width: contentWidth,
    align: 'center',
  });
  doc.moveDown(0.8);

  // Employee meta — two columns of label/value pairs
  doc.fontSize(10);
  const colWidth = contentWidth / 2;
  drawMetaRow(doc, left, colWidth, 'Mã NV:', p.employee.code, 'Họ tên:', p.employee.name ?? '—');
  drawMetaRow(
    doc,
    left,
    colWidth,
    'Phòng ban:',
    p.employee.department ?? '—',
    'Chức vụ:',
    p.employee.title ?? '—',
  );
  drawMetaRow(
    doc,
    left,
    colWidth,
    'MST:',
    p.employee.taxCode ?? '—',
    'Số sổ BHXH:',
    p.employee.bhxhCode ?? '—',
  );
  drawMetaRow(
    doc,
    left,
    colWidth,
    'Số NPT:',
    String(p.employee.dependents),
    'Vùng:',
    REGION_LABEL[p.employee.region],
  );
  doc.moveDown(0.6);

  // I. CÔNG
  sectionHeader(doc, left, contentWidth, 'I. CÔNG');
  dotted(doc, left, contentWidth, 'Ngày công chuẩn', String(p.standardWorkdays));
  dotted(doc, left, contentWidth, 'Ngày công thực tế', String(p.actualWorkdays));
  dotted(doc, left, contentWidth, 'Đi muộn (phút)', String(p.lateMinutes));
  dotted(doc, left, contentWidth, 'Về sớm (phút)', String(p.earlyLeaveMinutes));
  dotted(doc, left, contentWidth, 'OT ngày thường (phút)', String(p.otMinutesWeekday));
  dotted(doc, left, contentWidth, 'OT cuối tuần (phút)', String(p.otMinutesWeekend));
  dotted(doc, left, contentWidth, 'OT ngày lễ (phút)', String(p.otMinutesHoliday));
  doc.moveDown(0.5);

  // II. THU NHẬP
  sectionHeader(doc, left, contentWidth, 'II. THU NHẬP');
  dotted(doc, left, contentWidth, 'Lương cơ bản', fmt(p.baseSalary));
  for (const a of p.allowances) {
    dotted(doc, left, contentWidth, a.name || 'Phụ cấp', fmt(a.amount));
  }
  hr(doc, left, contentWidth);
  dotted(doc, left, contentWidth, 'Cộng', fmt(p.grossIncome), { bold: true });
  doc.moveDown(0.5);

  // III. CÁC KHOẢN TRỪ
  sectionHeader(doc, left, contentWidth, 'III. CÁC KHOẢN TRỪ');
  dotted(doc, left, contentWidth, 'Lương đóng BHXH', fmt(p.insurableBase));
  dotted(doc, left, contentWidth, '  BHXH (8%)', fmt(p.bhxhEmployee));
  dotted(doc, left, contentWidth, '  BHYT (1.5%)', fmt(p.bhytEmployee));
  dotted(doc, left, contentWidth, '  BHTN (1%)', fmt(p.bhtnEmployee));
  dotted(doc, left, contentWidth, 'Thu nhập tính thuế', fmt(p.taxableIncome));
  dotted(doc, left, contentWidth, 'Thuế TNCN', fmt(p.taxAmount));
  const deductionsSum = p.deductions.reduce((s, d) => s + d.amount, 0);
  for (const d of p.deductions) {
    const label = d.note ? `${d.name || 'Khấu trừ'} — ${d.note}` : d.name || 'Khấu trừ';
    dotted(doc, left, contentWidth, label, fmt(d.amount));
  }
  hr(doc, left, contentWidth);
  const totalDeductions = p.insuranceTotal + p.taxAmount + deductionsSum;
  dotted(doc, left, contentWidth, 'Tổng trừ', fmt(totalDeductions), { bold: true });
  doc.moveDown(0.8);

  // Net pay — emphasised box
  drawNetBox(doc, left, contentWidth, p.netPay);
  doc.moveDown(0.8);

  // Note
  doc.font('Regular').fontSize(10).fillColor('black');
  doc.text(`Ghi chú: ${p.computeNote ?? '—'}`, left, doc.y, { width: contentWidth });
  doc.moveDown(1.5);

  // Signatures — two columns
  drawSignatures(doc, left, contentWidth);
  doc.moveDown(1.5);

  // Footer
  const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  doc
    .font('Regular')
    .fontSize(8)
    .fillColor('#6b7280')
    .text(`Xuất bởi: ${p.generatedBy ?? '—'} @ ${stamp}`, left, doc.y, {
      width: contentWidth,
      align: 'right',
    });
}

function drawMetaRow(
  doc: PDFKit.PDFDocument,
  left: number,
  colWidth: number,
  label1: string,
  value1: string,
  label2: string,
  value2: string,
): void {
  const y = doc.y;
  doc.font('Bold').text(label1, left, y, { width: 70, continued: false });
  doc.font('Regular').text(value1, left + 70, y, { width: colWidth - 70 });
  doc.font('Bold').text(label2, left + colWidth, y, { width: 90 });
  doc.font('Regular').text(value2, left + colWidth + 90, y, { width: colWidth - 90 });
  doc.moveDown(0.2);
}

function sectionHeader(doc: PDFKit.PDFDocument, left: number, width: number, title: string): void {
  doc.font('Bold').fontSize(12).fillColor('black').text(title, left, doc.y, { width });
  hr(doc, left, width);
  doc.fontSize(10).font('Regular');
}

function hr(doc: PDFKit.PDFDocument, left: number, width: number): void {
  const y = doc.y + 1;
  doc
    .strokeColor('#cbd5e1')
    .lineWidth(0.5)
    .moveTo(left, y)
    .lineTo(left + width, y)
    .stroke();
  doc.moveDown(0.3);
}

function dotted(
  doc: PDFKit.PDFDocument,
  left: number,
  width: number,
  label: string,
  value: string,
  opts: { bold?: boolean } = {},
): void {
  const fontName = opts.bold ? 'Bold' : 'Regular';
  doc.font(fontName).fontSize(10).fillColor('black');
  const y = doc.y;
  const valueWidth = doc.widthOfString(value);
  const labelMaxWidth = width - valueWidth - 8;
  doc.text(label, left, y, { width: labelMaxWidth, continued: false });
  // Reset y in case label wrapped; place value on the *first* line baseline.
  doc.text(value, left + width - valueWidth, y, { width: valueWidth, lineBreak: false });
  doc.moveDown(0.15);
}

function drawNetBox(doc: PDFKit.PDFDocument, left: number, width: number, netPay: number): void {
  const boxHeight = 36;
  const y = doc.y;
  doc.strokeColor('#0f172a').lineWidth(1.5).rect(left, y, width, boxHeight).stroke();
  doc
    .font('Bold')
    .fontSize(16)
    .fillColor('black')
    .text(`LƯƠNG THỰC LĨNH: ${fmt(netPay)} ₫`, left, y + 10, {
      width,
      align: 'center',
    });
  doc.y = y + boxHeight;
}

function drawSignatures(doc: PDFKit.PDFDocument, left: number, width: number): void {
  const colWidth = width / 2;
  const y = doc.y;
  doc.font('Bold').fontSize(10).fillColor('black');
  doc.text('Người lập (Kế toán)', left, y, { width: colWidth, align: 'center' });
  doc.text('Người nhận', left + colWidth, y, { width: colWidth, align: 'center' });
  doc.moveDown(3);
  doc.font('Regular').fontSize(9).fillColor('#6b7280');
  const y2 = doc.y;
  doc.text('(Ký, ghi rõ họ tên)', left, y2, { width: colWidth, align: 'center' });
  doc.text('(Ký, ghi rõ họ tên)', left + colWidth, y2, { width: colWidth, align: 'center' });
}
