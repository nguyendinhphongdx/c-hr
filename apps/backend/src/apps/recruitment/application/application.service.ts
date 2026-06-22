import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStageKind, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';

import { EmployeeService } from '@/apps/hrm/employee/employee.service';
import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';
import { MailService } from '@libs/mail/mail.service';

import { ApplicationAcl } from './application.acl';
import { ApplicationRepository } from './application.repository';
import { computeMatch } from './matching';
import {
  CreateApplicationDto,
  HireApplicationDto,
  ListApplicationsDto,
  MoveStageDto,
  RejectApplicationDto,
  SendApplicationEmailDto,
} from './dto';

interface StageHistoryEntry {
  fromStageId: string | null;
  toStageId: string;
  userId: string;
  reason?: string;
  at: string;
}

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ApplicationRepository,
    private readonly ctx: RequestContextService,
    private readonly employees: EmployeeService,
    private readonly mail: MailService,
  ) {}

  async list(query: ListApplicationsDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const where: Prisma.ApplicationWhereInput = {};
    if (query.jobId) where.jobId = query.jobId;
    if (query.candidateId) where.candidateId = query.candidateId;
    if (query.stageId) where.stageId = query.stageId;
    return this.repo.findManyByOrg(orgId, where);
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Application not found');
    const job = await this.loadJobSubject(row.jobId);
    const acl = new ApplicationAcl({
      id: row.id,
      organizationId: row.organizationId,
      job,
    });
    await acl.require('canView');
    return { ...row, view: await acl.getAcl() };
  }

  async create(dto: CreateApplicationDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const [candidate, job] = await Promise.all([
      this.prisma.candidate.findFirst({
        where: { id: dto.candidateId, organizationId: orgId, deletedAt: null },
        select: { id: true, skills: true, yearsOfExperience: true },
      }),
      this.prisma.job.findFirst({
        where: { id: dto.jobId, organizationId: orgId, deletedAt: null },
        select: {
          id: true,
          requiredSkills: true,
          experienceMin: true,
          experienceMax: true,
        },
      }),
    ]);
    if (!candidate) throw new BadRequestException('Candidate not in org');
    if (!job) throw new BadRequestException('Job not in org');

    const existing = await this.repo.findByPair(dto.candidateId, dto.jobId);
    if (existing) {
      throw new ConflictException(
        'Candidate already applied to this job',
      );
    }

    const initialStage = await this.prisma.jobStage.findFirst({
      where: { jobId: dto.jobId, kind: JobStageKind.SOURCED },
      orderBy: { order: 'asc' },
    });
    if (!initialStage) {
      throw new BadRequestException(
        'Job has no SOURCED stage — corrupted pipeline',
      );
    }

    if (dto.resumeId) {
      const resume = await this.prisma.candidateResume.findFirst({
        where: { id: dto.resumeId, candidateId: dto.candidateId },
        select: { id: true },
      });
      if (!resume) throw new BadRequestException('Resume not on candidate');
    }

    const history: StageHistoryEntry[] = [
      {
        fromStageId: null,
        toStageId: initialStage.id,
        userId: callerId,
        at: new Date().toISOString(),
      },
    ];

    const match = computeMatch({
      job: {
        requiredSkills: job.requiredSkills,
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
      },
      candidate: {
        skills: candidate.skills,
        yearsOfExperience: candidate.yearsOfExperience,
      },
    });

    const created = await this.prisma.application.create({
      data: {
        organizationId: orgId,
        candidateId: dto.candidateId,
        jobId: dto.jobId,
        stageId: initialStage.id,
        resumeId: dto.resumeId ?? null,
        coverLetter: dto.coverLetter ?? null,
        expectedSalary: dto.expectedSalary ?? null,
        stageHistory: history as unknown as Prisma.JsonArray,
        matchScore: match.score,
        matchBreakdown: match.breakdown as unknown as Prisma.JsonObject,
      },
    });
    const full = await this.repo.findByIdByOrg(orgId, created.id);
    if (!full) {
      throw new NotFoundException('Application vanished after create');
    }
    return full;
  }

  async moveStage(id: string, dto: MoveStageDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Application not found');

    const job = await this.loadJobSubject(row.jobId);
    await new ApplicationAcl({
      id: row.id,
      organizationId: row.organizationId,
      job,
    }).require('canEdit');

    if (dto.stageId === row.stageId) {
      return row; // no-op
    }

    const stage = await this.prisma.jobStage.findFirst({
      where: { id: dto.stageId, jobId: row.jobId },
    });
    if (!stage) {
      throw new BadRequestException('Stage does not belong to this job');
    }

    const history = (row.stageHistory as unknown as StageHistoryEntry[]) ?? [];
    const next: StageHistoryEntry = {
      fromStageId: row.stageId,
      toStageId: stage.id,
      userId: callerId,
      reason: dto.reason,
      at: new Date().toISOString(),
    };
    history.push(next);

    const data: Prisma.ApplicationUncheckedUpdateInput = {
      stageId: stage.id,
      stageHistory: history as unknown as Prisma.JsonArray,
    };
    // Hitting the REJECTED kind also stamps the audit timestamp on the
    // dedicated columns so list endpoints can filter without parsing JSON.
    if (stage.kind === JobStageKind.REJECTED) {
      data.rejectedAt = new Date();
      data.rejectReason = dto.reason ?? null;
    } else if (row.rejectedAt) {
      // Un-reject if user moves it back into the pipeline.
      data.rejectedAt = null;
      data.rejectReason = null;
    }

    await this.repo.update(id, data);
    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) {
      throw new NotFoundException('Application vanished after move');
    }
    return updated;
  }

  async reject(id: string, dto: RejectApplicationDto) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Application not found');

    const rejectedStage = await this.prisma.jobStage.findFirst({
      where: { jobId: row.jobId, kind: JobStageKind.REJECTED },
    });
    if (!rejectedStage) {
      throw new BadRequestException('Job has no REJECTED stage');
    }
    return this.moveStage(id, { stageId: rejectedStage.id, reason: dto.reason });
  }

  async withdraw(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Application not found');

    const job = await this.loadJobSubject(row.jobId);
    await new ApplicationAcl({
      id: row.id,
      organizationId: row.organizationId,
      job,
    }).require('canEdit');

    if (row.withdrawnAt) return row;
    await this.repo.update(id, { withdrawnAt: new Date() });
    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) {
      throw new NotFoundException('Application vanished after withdraw');
    }
    return updated;
  }

  /**
   * Convert a HIRED application into an Employee record. Reuses
   * EmployeeService.create so the employee.created event still fires
   * and the EMP- code uniqueness is enforced by the same path as
   * manual creation.
   *
   * Returns the updated application; the new employeeId is reachable
   * via `candidate.employeeId` on the response payload.
   */
  async hire(id: string, dto: HireApplicationDto) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Application not found');

    const job = await this.loadJobSubject(row.jobId);
    await new ApplicationAcl({
      id: row.id,
      organizationId: row.organizationId,
      job,
    }).require('canEdit');

    const candidate = await this.prisma.candidate.findFirst({
      where: { id: row.candidateId, organizationId: orgId, deletedAt: null },
    });
    if (!candidate) {
      throw new BadRequestException('Candidate not found');
    }
    if (candidate.employeeId) {
      throw new ConflictException('Candidate already linked to an employee');
    }

    const stage = await this.prisma.jobStage.findUnique({
      where: { id: row.stageId },
      select: { kind: true },
    });
    if (stage?.kind !== JobStageKind.HIRED) {
      throw new BadRequestException(
        'Application must be in HIRED stage before converting to employee',
      );
    }

    const jobRow = await this.prisma.job.findUnique({
      where: { id: row.jobId },
      select: { departmentId: true, title: true },
    });

    // Reuse EmployeeService.create (link-existing-user mode when the
    // candidate already has a User, else "new-user" mode with a random
    // initial password — HR sends a reset link separately).
    const created = candidate.userId
      ? await this.employees.create({
          code: dto.code,
          userId: candidate.userId,
          departmentId: dto.departmentId ?? jobRow?.departmentId ?? undefined,
          title: dto.title ?? jobRow?.title ?? undefined,
          hireDate: dto.hireDate,
        })
      : await this.employees.create({
          code: dto.code,
          email: candidate.email,
          name: candidate.fullName,
          password: randomBytes(12).toString('hex'),
          departmentId: dto.departmentId ?? jobRow?.departmentId ?? undefined,
          title: dto.title ?? jobRow?.title ?? undefined,
          hireDate: dto.hireDate,
        });

    // Apply baseSalary post-create — not in CreateEmployeeDto.
    const updates: Prisma.EmployeeUncheckedUpdateInput = {};
    if (dto.baseSalary !== undefined) updates.baseSalary = dto.baseSalary;
    if (Object.keys(updates).length > 0) {
      await this.prisma.employee.update({
        where: { id: created.id },
        data: updates,
      });
    }

    await this.prisma.candidate.update({
      where: { id: candidate.id },
      data: { employeeId: created.id },
    });

    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) {
      throw new NotFoundException('Application vanished after hire');
    }
    return updated;
  }

  private async loadJobSubject(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, createdById: true, hiringManagerId: true },
    });
    if (!job) throw new NotFoundException('Parent job missing');
    return job;
  }

  /**
   * Send an HTML email to the candidate associated with this application
   * and append a log entry on `application.emails`. Recruiters use this
   * for interview invites, rejection notices, follow-ups, etc.
   *
   * Body is appended with a small "Đăng nhập …" footer linking back to
   * the C-HR public-facing job URL (best-effort).
   */
  async sendEmail(id: string, dto: SendApplicationEmailDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Application not found');

    const job = await this.loadJobSubject(row.jobId);
    await new ApplicationAcl({
      id: row.id,
      organizationId: row.organizationId,
      job,
    }).require('canEdit');

    if (!row.candidate.email) {
      throw new BadRequestException('Candidate has no email on file');
    }

    const caller = await this.prisma.user.findUnique({
      where: { id: callerId },
      select: { name: true, email: true },
    });

    await this.mail.send({
      to: row.candidate.email,
      subject: dto.subject,
      html: dto.bodyHtml,
      replyTo: dto.replyTo ?? caller?.email ?? undefined,
    });

    const emails =
      (row.emails as unknown as Array<Record<string, unknown>>) ?? [];
    emails.push({
      subject: dto.subject,
      sentAt: new Date().toISOString(),
      sentByUserId: callerId,
      sentByName: caller?.name ?? caller?.email ?? null,
      snippet: htmlSnippet(dto.bodyHtml),
    });
    await this.repo.update(id, {
      emails: emails as unknown as Prisma.JsonArray,
    });

    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) {
      throw new NotFoundException('Application vanished after email');
    }
    return updated;
  }
}

function htmlSnippet(html: string, max = 200): string {
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}
