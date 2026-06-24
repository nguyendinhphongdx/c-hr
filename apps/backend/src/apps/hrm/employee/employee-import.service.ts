import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { ImportService } from '@/common/import';
import { PrismaService } from '@libs/database/prisma.service';

import {
  BulkCreateEmployeesDto,
  EmployeeImportBulkResponse,
  EmployeeImportParseResponse,
  ParsedEmployeeRow,
} from './dto';
import { EmployeeService } from './employee.service';

const PASSWORD_BCRYPT_ROUNDS = 10;

const REQUIRED_HEADERS = ['employeeCode', 'email', 'name'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class EmployeeImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly importer: ImportService,
    private readonly employeeService: EmployeeService,
  ) {}

  /**
   * Parse + validate an upload. Each row is annotated with `status` and
   * `errors[]` so the FE can preview before committing. Validation covers:
   *   - required fields (employeeCode, email, name)
   *   - email format
   *   - duplicate within the file
   *   - email already in DB (any org — User.email is globally unique)
   *   - employeeCode already in this Org
   */
  async parse(file: Express.Multer.File): Promise<EmployeeImportParseResponse> {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const parsed = this.importer.parse(file);

    const rows: ParsedEmployeeRow[] = parsed.rows.map((r) => ({
      rowNumber: r.rowNumber,
      employeeCode: r.data.employeeCode ?? '',
      attendanceCode: r.data.attendanceCode || null,
      email: r.data.email ?? '',
      name: r.data.name ?? '',
      title: r.data.title ? r.data.title : null,
      status: 'valid',
      errors: [],
    }));

    const codesInFile = new Map<string, number[]>();
    const attendanceCodesInFile = new Map<string, number[]>();
    const emailsInFile = new Map<string, number[]>();
    for (const row of rows) {
      if (row.employeeCode) {
        const list = codesInFile.get(row.employeeCode) ?? [];
        list.push(row.rowNumber);
        codesInFile.set(row.employeeCode, list);
      }
      if (row.email) {
        const list = emailsInFile.get(row.email.toLowerCase()) ?? [];
        list.push(row.rowNumber);
        emailsInFile.set(row.email.toLowerCase(), list);
      }
      if (row.attendanceCode) {
        const list = attendanceCodesInFile.get(row.attendanceCode) ?? [];
        list.push(row.rowNumber);
        attendanceCodesInFile.set(row.attendanceCode, list);
      }
    }

    const allEmails = Array.from(emailsInFile.keys());
    const allCodes = Array.from(codesInFile.keys());
    const allAttendanceCodes = Array.from(attendanceCodesInFile.keys());

    const [existingUsers, existingEmployees, existingAttendanceEmployees] = await Promise.all([
      allEmails.length
        ? this.prisma.user.findMany({
            where: { email: { in: allEmails } },
            select: { email: true },
          })
        : Promise.resolve([]),
      allCodes.length
        ? this.prisma.employee.findMany({
            where: {
              organizationId: orgId,
              code: { in: allCodes },
              deletedAt: null,
            },
            select: { code: true },
          })
        : Promise.resolve([]),
      allAttendanceCodes.length
        ? this.prisma.employee.findMany({
            where: {
              organizationId: orgId,
              attendanceCode: { in: allAttendanceCodes },
              deletedAt: null,
            },
            select: { attendanceCode: true },
          })
        : Promise.resolve([]),
    ]);
    const existingEmailSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const existingCodeSet = new Set(existingEmployees.map((e) => e.code));
    const existingAttendanceCodeSet = new Set(
      existingAttendanceEmployees.flatMap((employee) =>
        employee.attendanceCode ? [employee.attendanceCode] : [],
      ),
    );

    for (const row of rows) {
      const errors: string[] = [];

      for (const f of REQUIRED_HEADERS) {
        const v = (row as unknown as Record<string, string>)[f];
        if (!v || !v.trim()) errors.push(`Thiếu cột '${f}'`);
      }
      if (row.email && !EMAIL_RE.test(row.email)) {
        errors.push(`Email không hợp lệ: ${row.email}`);
      }

      const codeDup = row.employeeCode && (codesInFile.get(row.employeeCode)?.length ?? 0) > 1;
      if (codeDup) errors.push(`Mã '${row.employeeCode}' trùng trong file`);

      const emailDup = row.email && (emailsInFile.get(row.email.toLowerCase())?.length ?? 0) > 1;
      if (emailDup) errors.push(`Email '${row.email}' trùng trong file`);

      const attendanceCodeDup =
        row.attendanceCode && (attendanceCodesInFile.get(row.attendanceCode)?.length ?? 0) > 1;
      if (attendanceCodeDup) {
        errors.push(`Mã chấm công '${row.attendanceCode}' trùng trong file`);
      }

      if (row.email && existingEmailSet.has(row.email.toLowerCase())) {
        errors.push(`Email '${row.email}' đã tồn tại trong hệ thống`);
      }
      if (row.employeeCode && existingCodeSet.has(row.employeeCode)) {
        errors.push(`Mã '${row.employeeCode}' đã tồn tại trong Org`);
      }
      if (row.attendanceCode && existingAttendanceCodeSet.has(row.attendanceCode)) {
        errors.push(`Mã chấm công '${row.attendanceCode}' đã tồn tại trong Org`);
      }

      row.errors = errors;
      row.status = errors.length === 0 ? 'valid' : 'invalid';
    }

    return {
      rows,
      summary: {
        total: rows.length,
        valid: rows.filter((r) => r.status === 'valid').length,
        invalid: rows.filter((r) => r.status === 'invalid').length,
      },
    };
  }

  /**
   * Bulk create. Each row becomes a User + Employee in one transaction.
   * Per-row failures (e.g. a race-condition email collision) are captured
   * and returned in `failed[]` instead of aborting the whole batch.
   */
  async bulkCreate(dto: BulkCreateEmployeesDto): Promise<EmployeeImportBulkResponse> {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const passwordHash = await bcrypt.hash(dto.defaultPassword, PASSWORD_BCRYPT_ROUNDS);

    let created = 0;
    const failed: EmployeeImportBulkResponse['failed'] = [];

    for (const row of dto.rows) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const employee = await tx.employee.create({
            data: {
              organizationId: orgId,
              code: row.employeeCode,
              attendanceCode: row.attendanceCode ?? null,
              title: row.title ?? null,
            },
          });
          await tx.user.create({
            data: {
              email: row.email,
              name: row.name,
              password: passwordHash,
              role: 'user',
              organizationId: orgId,
              employeeId: employee.id,
            },
          });
          if (row.attendanceCode) {
            await this.employeeService.linkPendingAttendance(tx, orgId, employee.id, row.attendanceCode);
          }
        });
        created += 1;
      } catch (err) {
        failed.push({
          rowNumber: null,
          email: row.email,
          reason: err instanceof Error ? err.message : 'Lỗi không xác định',
        });
      }
    }

    return { created, failed };
  }
}
