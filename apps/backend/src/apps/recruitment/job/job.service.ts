import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JobStageKind, JobStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { computeMatch } from '../application/matching';

import { CreateJobDto, ListJobsDto, UpdateJobDto } from './dto';
import { JobAcl } from './job.acl';
import { JobRepository } from './job.repository';

/**
 * Default pipeline created with every new Job. Org cấu hình thêm/bớt
 * stage sau qua endpoint riêng (Phase 2 — chưa làm).
 */
const DEFAULT_STAGES: ReadonlyArray<{ kind: JobStageKind; name: string }> = [
  { kind: JobStageKind.SOURCED, name: 'Tìm nguồn' },
  { kind: JobStageKind.SCREENING, name: 'Sàng lọc CV' },
  { kind: JobStageKind.INTERVIEW, name: 'Phỏng vấn' },
  { kind: JobStageKind.OFFER, name: 'Đề nghị' },
  { kind: JobStageKind.HIRED, name: 'Đã tuyển' },
  { kind: JobStageKind.REJECTED, name: 'Đã loại' },
];

@Injectable()
export class JobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: JobRepository,
    private readonly ctx: RequestContextService,
  ) {}

  async list(query: ListJobsDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);
    const where: Prisma.JobWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { code: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const rows = await this.repo.findManyByOrg(orgId, where);
    return rows.map((row) => this.shape(row));
  }

  async findOne(idOrSlug: string) {
    const orgId = this.ctx.requireOrg();
    const row =
      (await this.repo.findByIdByOrg(orgId, idOrSlug)) ??
      (await this.repo.findBySlugByOrg(orgId, idOrSlug));
    if (!row) throw new NotFoundException('Job not found');

    const acl = new JobAcl(row);
    await acl.require('canView');
    return { ...this.shape(row), view: await acl.getAcl() };
  }

  async create(dto: CreateJobDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    if (dto.experienceMin !== undefined && dto.experienceMax !== undefined) {
      if (dto.experienceMax < dto.experienceMin) {
        throw new BadRequestException('experienceMax must be ≥ experienceMin');
      }
    }
    if (dto.salaryMin !== undefined && dto.salaryMax !== undefined) {
      if (dto.salaryMax < dto.salaryMin) {
        throw new BadRequestException('salaryMax must be ≥ salaryMin');
      }
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId: orgId },
        select: { id: true },
      });
      if (!dept) throw new BadRequestException('Department not in org');
    }
    if (dto.hiringManagerId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.hiringManagerId, organizationId: orgId },
        select: { id: true },
      });
      if (!user) throw new BadRequestException('Hiring manager not in org');
    }

    const code = await this.nextJobCode(orgId);
    const slug = await this.generateSlug(dto.title);

    const created = await this.prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          organizationId: orgId,
          code,
          slug,
          title: dto.title,
          description: dto.description,
          requirements: dto.requirements,
          benefits: dto.benefits ?? null,
          departmentId: dto.departmentId ?? null,
          hiringManagerId: dto.hiringManagerId ?? null,
          createdById: callerId,
          jobType: dto.jobType,
          workMode: dto.workMode,
          workAddresses: dto.workAddresses as unknown as Prisma.JsonArray,
          experienceMin: dto.experienceMin ?? null,
          experienceMax: dto.experienceMax ?? null,
          salaryMin: dto.salaryMin ?? null,
          salaryMax: dto.salaryMax ?? null,
          salaryNegotiable: dto.salaryNegotiable ?? false,
          currency: dto.currency ?? 'VND',
          requiredSkills: dto.requiredSkills,
          niceToHaveSkills: dto.niceToHaveSkills ?? [],
          headcount: dto.headcount ?? 1,
          isUrgent: dto.isUrgent ?? false,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      });
      await tx.jobStage.createMany({
        data: DEFAULT_STAGES.map((s, idx) => ({
          jobId: job.id,
          kind: s.kind,
          name: s.name,
          order: idx,
        })),
      });
      return job;
    });

    const full = await this.repo.findByIdByOrg(orgId, created.id);
    if (!full) throw new NotFoundException('Job vanished after create');
    return this.shape(full);
  }

  async update(id: string, dto: UpdateJobDto) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Job not found');
    await new JobAcl(row).require('canEdit');

    const data: Prisma.JobUncheckedUpdateInput = {};
    const assign = <K extends keyof UpdateJobDto>(
      key: K,
      column: keyof Prisma.JobUncheckedUpdateInput,
    ) => {
      const v = dto[key];
      if (v !== undefined) (data as Record<string, unknown>)[column] = v;
    };
    assign('title', 'title');
    assign('description', 'description');
    assign('requirements', 'requirements');
    assign('benefits', 'benefits');
    assign('departmentId', 'departmentId');
    assign('hiringManagerId', 'hiringManagerId');
    assign('jobType', 'jobType');
    assign('workMode', 'workMode');
    if (dto.workAddresses !== undefined) {
      data.workAddresses = dto.workAddresses as unknown as Prisma.JsonArray;
    }
    assign('experienceMin', 'experienceMin');
    assign('experienceMax', 'experienceMax');
    assign('salaryMin', 'salaryMin');
    assign('salaryMax', 'salaryMax');
    assign('salaryNegotiable', 'salaryNegotiable');
    assign('currency', 'currency');
    assign('requiredSkills', 'requiredSkills');
    assign('niceToHaveSkills', 'niceToHaveSkills');
    assign('headcount', 'headcount');
    assign('isUrgent', 'isUrgent');
    if (dto.expiresAt !== undefined) {
      data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    const matchInputsChanged =
      dto.requiredSkills !== undefined ||
      dto.experienceMin !== undefined ||
      dto.experienceMax !== undefined;

    await this.repo.update(id, data);
    if (matchInputsChanged) {
      await this.recomputeMatchForJob(id);
    }
    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) throw new NotFoundException('Job vanished after update');
    return { ...this.shape(updated), view: await new JobAcl(updated).getAcl() };
  }

  /**
   * Recompute every application's matchScore for this job — called when
   * requiredSkills / experienceMin / experienceMax change so older
   * applications don't drift out of sync with the new criteria.
   */
  private async recomputeMatchForJob(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: {
        requiredSkills: true,
        experienceMin: true,
        experienceMax: true,
      },
    });
    if (!job) return;
    const applications = await this.prisma.application.findMany({
      where: { jobId },
      select: {
        id: true,
        candidate: { select: { skills: true, yearsOfExperience: true } },
      },
    });
    for (const app of applications) {
      const match = computeMatch({
        job: {
          requiredSkills: job.requiredSkills,
          experienceMin: job.experienceMin,
          experienceMax: job.experienceMax,
        },
        candidate: {
          skills: app.candidate.skills,
          yearsOfExperience: app.candidate.yearsOfExperience,
        },
      });
      await this.prisma.application.update({
        where: { id: app.id },
        data: {
          matchScore: match.score,
          matchBreakdown: match.breakdown as unknown as Prisma.JsonObject,
        },
      });
    }
  }

  async publish(id: string) {
    return this.transition(id, JobStatus.PUBLISHED, 'canPublish');
  }

  async pause(id: string) {
    return this.transition(id, JobStatus.PAUSED, 'canPublish');
  }

  async close(id: string) {
    return this.transition(id, JobStatus.CLOSED, 'canClose');
  }

  async softDelete(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Job not found');
    await new JobAcl(row).require('canDelete');
    await this.repo.softDelete(id);
    return { id, success: true as const };
  }

  // ──────────────────────────────────────────────────────────────────

  private async transition(id: string, next: JobStatus, action: 'canPublish' | 'canClose') {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Job not found');
    const acl = new JobAcl(row);
    if (action === 'canPublish' && !acl.canPublish()) {
      throw new BadRequestException('Not allowed to publish/pause');
    }
    if (action === 'canClose' && !acl.canClose()) {
      throw new BadRequestException('Not allowed to close');
    }
    const data: Prisma.JobUncheckedUpdateInput = { status: next };
    if (next === JobStatus.PUBLISHED && !row.publishedAt) {
      data.publishedAt = new Date();
    }
    if (next === JobStatus.CLOSED) {
      data.closedAt = new Date();
    }
    await this.repo.update(id, data);
    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) throw new NotFoundException('Job vanished after transition');
    return { ...this.shape(updated), view: await new JobAcl(updated).getAcl() };
  }

  private async nextJobCode(orgId: string): Promise<string> {
    // Counter = current non-deleted count + 1. Collisions handled by the
    // org+code unique constraint; on conflict retry with bump.
    const base = (await this.repo.countByOrg(orgId)) + 1;
    for (let n = base; n < base + 10; n++) {
      const code = `JOB-${n}`;
      const exists = await this.prisma.job.findFirst({
        where: { organizationId: orgId, code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    throw new BadRequestException('Could not allocate job code');
  }

  private async generateSlug(title: string): Promise<string> {
    const base = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    const safe = base || 'job';
    for (let i = 0; i < 5; i++) {
      const suffix = randomBytes(3).toString('hex');
      const slug = `${safe}-${suffix}`;
      if (!(await this.repo.slugExists(slug))) return slug;
    }
    throw new BadRequestException('Could not allocate job slug');
  }

  private shape(row: Awaited<ReturnType<JobRepository['findByIdByOrg']>>) {
    return row;
  }
}
