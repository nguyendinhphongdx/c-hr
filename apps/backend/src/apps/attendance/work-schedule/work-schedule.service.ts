import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { CreateWorkScheduleDto, ShiftInputDto, UpdateWorkScheduleDto } from './dto';
import { WorkScheduleRepository } from './work-schedule.repository';

@Injectable()
export class WorkScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: WorkScheduleRepository,
  ) {}

  async list() {
    const orgId = this.ctx.requireOrg();
    return this.repo.findManyByOrg(orgId);
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Work schedule not found');
    return row;
  }

  async create(dto: CreateWorkScheduleDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);
    this.assertNoDayOverlap(dto.shifts);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await this.clearDefault(tx, orgId);
      return tx.workSchedule.create({
        data: {
          organizationId: orgId,
          name: dto.name,
          isDefault: dto.isDefault ?? false,
          shifts: { create: dto.shifts.map(toShiftCreate) },
        },
        include: { shifts: { orderBy: { name: 'asc' } } },
      });
    });
  }

  async update(id: string, dto: UpdateWorkScheduleDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Work schedule not found');

    if (dto.shifts) this.assertNoDayOverlap(dto.shifts);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) await this.clearDefault(tx, orgId, id);

      if (dto.shifts) {
        await tx.workShift.deleteMany({ where: { workScheduleId: id } });
        await tx.workShift.createMany({
          data: dto.shifts.map((s) => ({
            workScheduleId: id,
            ...toShiftCreate(s),
          })),
        });
      }

      return tx.workSchedule.update({
        where: { id },
        data: {
          name: dto.name ?? undefined,
          isDefault: dto.isDefault ?? undefined,
        },
        include: { shifts: { orderBy: { name: 'asc' } } },
      });
    });
  }

  async softDelete(id: string) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Work schedule not found');
    if (existing.isDefault) {
      throw new BadRequestException(
        'Cannot delete the default schedule. Mark another as default first.',
      );
    }

    await this.prisma.workSchedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, success: true };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  /**
   * MVP constraint: 1 day belongs to at most 1 shift in a given schedule.
   * Throws when 2 shifts both list the same ISO weekday.
   */
  private assertNoDayOverlap(shifts: ShiftInputDto[]) {
    const seen = new Map<number, string>();
    for (const s of shifts) {
      for (const day of s.daysOfWeek) {
        const owner = seen.get(day);
        if (owner) {
          throw new BadRequestException(
            `Day ${day} appears in both "${owner}" and "${s.name}" — only one shift per day is allowed.`,
          );
        }
        seen.set(day, s.name);
      }
    }
  }

  /** Clear is_default on every other schedule in the Org. */
  private async clearDefault(tx: Prisma.TransactionClient, orgId: string, keepId?: string) {
    await tx.workSchedule.updateMany({
      where: {
        organizationId: orgId,
        isDefault: true,
        ...(keepId ? { NOT: { id: keepId } } : {}),
      },
      data: { isDefault: false },
    });
  }
}

function toShiftCreate(s: ShiftInputDto) {
  return {
    name: s.name,
    startTime: s.startTime,
    endTime: s.endTime,
    daysOfWeek: s.daysOfWeek,
    breakMinutes: s.breakMinutes ?? 0,
    lateGraceMinutes: s.lateGraceMinutes ?? 15,
    crossesMidnight: s.crossesMidnight ?? false,
  };
}
