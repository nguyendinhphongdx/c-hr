import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { CreateHolidayDto, ListHolidaysDto, UpdateHolidayDto } from './dto';
import { HolidayRepository } from './holiday.repository';

/**
 * Holiday CRUD + helpers for OT bucket classification.
 *
 * Reads + mutations are HRM-admin gated (payroll-relevant data). The
 * `listSetByYearMonth` helper exposes a per-(org,year,month) `Set<string>`
 * of `YYYY-MM-DD` keys so callers (TimesheetReportService) can do O(1)
 * per-day lookups without hammering the DB.
 */
@Injectable()
export class HolidayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: HolidayRepository,
  ) {}

  async list(query: ListHolidaysDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const where: Prisma.HolidayWhereInput = {};
    if (query.from || query.to) {
      const range: Prisma.DateTimeFilter = {};
      if (query.from) range.gte = parseDateOnly(query.from);
      if (query.to) range.lte = parseDateOnly(query.to);
      where.date = range;
    } else if (query.year !== undefined) {
      where.date = {
        gte: new Date(Date.UTC(query.year, 0, 1)),
        lte: new Date(Date.UTC(query.year, 11, 31)),
      };
    }

    return this.repo.findManyByOrg(orgId, where);
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Holiday not found');
    return row;
  }

  async create(dto: CreateHolidayDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const date = parseDateOnly(dto.date);
    return this.repo
      .create({
        organizationId: orgId,
        date,
        name: dto.name,
        isPaid: dto.isPaid ?? true,
      })
      .catch((err) => {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ConflictException('Ngày này đã có trong danh sách lễ');
        }
        throw err;
      });
  }

  async update(id: string, dto: UpdateHolidayDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Holiday not found');

    const data: Prisma.HolidayUncheckedUpdateInput = {};
    if (dto.date !== undefined) data.date = parseDateOnly(dto.date);
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.isPaid !== undefined) data.isPaid = dto.isPaid;

    return this.repo.update(id, data).catch((err) => {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Ngày này đã có trong danh sách lễ');
      }
      throw err;
    });
  }

  async softDelete(id: string) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Holiday not found');

    await this.repo.softDelete(id);
    return { id, success: true as const };
  }

  /**
   * Single-date check. Direct query — used by ad-hoc callers; the hot
   * per-day classification path in TimesheetReportService prefers
   * `listSetByYearMonth` for O(1) lookups.
   */
  async isHolidayDate(organizationId: string, date: Date): Promise<boolean> {
    const dayOnly = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const found = await this.repo.findByDateByOrg(organizationId, dayOnly);
    return !!found;
  }

  /**
   * Batch helper for per-day iteration. Returns the `YYYY-MM-DD` set of
   * holiday dates inside the given month — so `set.has(toDateKey(d))` is
   * O(1). One query covers the whole month regardless of holiday count.
   */
  async listSetByYearMonth(
    organizationId: string,
    year: number,
    month: number,
  ): Promise<Set<string>> {
    if (month < 1 || month > 12) {
      throw new BadRequestException('Month must be between 1 and 12');
    }
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 0));
    const rows = await this.prisma.holiday.findMany({
      where: {
        organizationId,
        deletedAt: null,
        date: { gte: from, lte: to },
      },
      select: { date: true },
    });
    return new Set(rows.map((r) => toDateKey(r.date)));
  }

  /**
   * Range variant — covers multi-month timesheet windows in a single
   * query. `from`/`to` inclusive, parsed as UTC midnight. Returned set
   * keys are `YYYY-MM-DD`.
   */
  async listSetByRange(organizationId: string, from: Date, to: Date): Promise<Set<string>> {
    const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    const rows = await this.prisma.holiday.findMany({
      where: {
        organizationId,
        deletedAt: null,
        date: { gte: start, lte: end },
      },
      select: { date: true },
    });
    return new Set(rows.map((r) => toDateKey(r.date)));
  }
}

function parseDateOnly(raw: string): Date {
  // Force UTC midnight so a "YYYY-MM-DD" input round-trips back to the
  // same calendar day regardless of server tz.
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException(`Invalid date: ${raw}`);
  }
  return d;
}

function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
