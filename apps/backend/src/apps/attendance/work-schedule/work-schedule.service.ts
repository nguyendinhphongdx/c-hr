import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceMode } from '@prisma/client';

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

    return this.prisma.workSchedule.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        shifts: { create: dto.shifts.map(toShiftCreate) },
      },
      include: { shifts: { orderBy: { name: 'asc' } } },
    });
  }

  async update(id: string, dto: UpdateWorkScheduleDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const existing = await this.repo.findByIdByOrg(orgId, id);
    if (!existing) throw new NotFoundException('Work schedule not found');

    if (dto.shifts) this.assertNoDayOverlap(dto.shifts);

    return this.prisma.$transaction(async (tx) => {
      if (dto.shifts) {
        await tx.workShift.deleteMany({ where: { workScheduleId: id } });
        await tx.workShift.createMany({
          data: dto.shifts.map((s) => ({ workScheduleId: id, ...toShiftCreate(s) })),
        });
      }

      return tx.workSchedule.update({
        where: { id },
        data: {
          name: dto.name ?? undefined,
          effectiveFrom:
            dto.effectiveFrom !== undefined
              ? dto.effectiveFrom === null
                ? null
                : new Date(dto.effectiveFrom)
              : undefined,
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

    await this.prisma.workSchedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, success: true };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

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
}

function toShiftCreate(s: ShiftInputDto) {
  const mode: AttendanceMode = (s.mode as AttendanceMode | undefined) ?? AttendanceMode.FIXED;
  const config =
    mode === 'FLEXIBLE'
      ? { windowMinutes: s.windowMinutes ?? 60 }
      : { lateGraceMinutes: s.lateGraceMinutes ?? 15 };

  return {
    name: s.name,
    startTime: s.startTime,
    endTime: s.endTime,
    daysOfWeek: s.daysOfWeek,
    breakMinutes: s.breakMinutes ?? 0,
    crossesMidnight: s.crossesMidnight ?? false,
    mode,
    config,
  };
}
