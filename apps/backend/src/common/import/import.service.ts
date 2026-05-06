import { Injectable, BadRequestException } from '@nestjs/common';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedRow {
  /** 1-based row number including header (so first data row = 2). */
  rowNumber: number;
  data: Record<string, string>;
}

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
}

/**
 * Parse a CSV or XLSX upload into a uniform shape.
 *
 * The service is feature-agnostic: it just turns a file into rows of
 * stringly-typed key-value records. Per-feature validation (required
 * fields, format, uniqueness, FK existence) happens in the calling
 * module's service so the caller controls the schema.
 */
@Injectable()
export class ImportService {
  parse(file: Express.Multer.File): ParseResult {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File rỗng hoặc không hợp lệ.');
    }

    const ext = (file.originalname?.split('.').pop() ?? '').toLowerCase();
    const mime = file.mimetype ?? '';

    if (ext === 'csv' || mime.includes('csv') || mime === 'text/plain') {
      return this.parseCsv(file.buffer);
    }
    if (
      ext === 'xlsx' ||
      ext === 'xls' ||
      mime.includes('spreadsheet') ||
      mime.includes('excel')
    ) {
      return this.parseXlsx(file.buffer);
    }
    throw new BadRequestException(
      `Định dạng file không hỗ trợ (.${ext || '?'}). Chỉ chấp nhận CSV hoặc XLSX.`,
    );
  }

  private parseCsv(buffer: Buffer): ParseResult {
    const text = stripBom(buffer.toString('utf-8'));
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      transform: (v) => (typeof v === 'string' ? v.trim() : v),
    });

    if (result.errors?.length) {
      const first = result.errors[0];
      throw new BadRequestException(
        `Lỗi parse CSV ở dòng ${(first.row ?? 0) + 2}: ${first.message}`,
      );
    }

    const rows: ParsedRow[] = (result.data ?? []).map((data, i) => ({
      rowNumber: i + 2,
      data,
    }));

    return { rows, headers: result.meta.fields ?? [] };
  }

  private parseXlsx(buffer: Buffer): ParseResult {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('File XLSX không có sheet nào.');
    }
    const sheet = wb.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });

    const headers =
      records[0] ? Object.keys(records[0]).map((h) => h.trim()) : [];

    const rows: ParsedRow[] = records.map((rec, i) => {
      const data: Record<string, string> = {};
      for (const [k, v] of Object.entries(rec)) {
        data[k.trim()] = typeof v === 'string' ? v.trim() : String(v ?? '').trim();
      }
      return { rowNumber: i + 2, data };
    });

    return { rows, headers };
  }
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}
