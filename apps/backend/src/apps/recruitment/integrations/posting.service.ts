import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JobBoard, Prisma } from '@prisma/client';

import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { AdapterRegistry } from './adapter.registry';
import { PublishJobInput } from './adapter.interface';
import { IntegrationService } from './integration.service';

interface JobForPush {
  id: string;
  title: string;
  description: string;
  requirements: string;
  benefits: string | null;
  jobType: PublishJobInput['jobType'];
  workMode: PublishJobInput['workMode'];
  workAddresses: unknown;
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: Prisma.Decimal | null;
  salaryMax: Prisma.Decimal | null;
  salaryNegotiable: boolean;
  currency: string;
  requiredSkills: string[];
  niceToHaveSkills: string[];
  headcount: number;
  isUrgent: boolean;
  expiresAt: Date | null;
  slug: string;
}

@Injectable()
export class PostingService {
  private readonly logger = new Logger(PostingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly adapters: AdapterRegistry,
    private readonly integrations: IntegrationService,
  ) {}

  /**
   * Push (or repush) a job to a single board. Idempotent — if a
   * JobBoardPosting already exists, call adapter.update; otherwise
   * adapter.publish + create the row.
   */
  async pushJob(jobId: string, board: JobBoard) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'RECRUITMENT', orgId, this.prisma);

    const job = await this.prisma.job.findFirst({
      where: { id: jobId, organizationId: orgId, deletedAt: null },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'DRAFT') {
      throw new BadRequestException('Publish the job internally first');
    }

    const integration = await this.integrations.getCredentials(orgId, board, {
      requireActive: true,
    });
    const adapter = this.adapters.get(board);

    const input = this.buildPublishInput(job);
    const existing = await this.prisma.jobBoardPosting.findUnique({
      where: {
        jobId_integrationId: { jobId: job.id, integrationId: integration.id },
      },
    });

    try {
      if (existing) {
        await adapter.update(existing.externalId, input, integration.credentials);
        const row = await this.prisma.jobBoardPosting.update({
          where: { id: existing.id },
          data: {
            lastSyncStatus: 'SUCCESS',
            lastSyncError: null,
          },
        });
        await this.touchIntegration(integration.id, null);
        return row;
      }
      const result = await adapter.publish(input, integration.credentials);
      const row = await this.prisma.jobBoardPosting.create({
        data: {
          jobId: job.id,
          integrationId: integration.id,
          externalId: result.externalId,
          externalUrl: result.externalUrl ?? null,
          lastSyncStatus: 'SUCCESS',
          publishedAt: new Date(),
        },
      });
      await this.touchIntegration(integration.id, null);
      return row;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Push to ${board} failed for job ${job.id}: ${message}`);
      if (existing) {
        await this.prisma.jobBoardPosting.update({
          where: { id: existing.id },
          data: { lastSyncStatus: 'FAILED', lastSyncError: message },
        });
      }
      await this.touchIntegration(integration.id, message);
      throw new BadRequestException(`Push failed: ${message}`);
    }
  }

  async closePosting(jobId: string, board: JobBoard) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'RECRUITMENT', orgId, this.prisma);

    const integration = await this.integrations.getCredentials(orgId, board);
    const existing = await this.prisma.jobBoardPosting.findUnique({
      where: {
        jobId_integrationId: { jobId, integrationId: integration.id },
      },
    });
    if (!existing) throw new NotFoundException('No posting to close');

    const adapter = this.adapters.get(board);
    try {
      await adapter.close(existing.externalId, integration.credentials);
      return this.prisma.jobBoardPosting.update({
        where: { id: existing.id },
        data: {
          lastSyncStatus: 'CLOSED',
          closedAt: new Date(),
          lastSyncError: null,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.jobBoardPosting.update({
        where: { id: existing.id },
        data: { lastSyncStatus: 'FAILED', lastSyncError: message },
      });
      throw new BadRequestException(`Close failed: ${message}`);
    }
  }

  /**
   * Returns the per-board push status for a job — used by the
   * "Đăng tin" tab to render the current state of each integration.
   */
  async listForJob(jobId: string) {
    const orgId = this.ctx.requireOrg();
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, organizationId: orgId },
      select: { id: true },
    });
    if (!job) throw new NotFoundException('Job not found');

    return this.prisma.jobBoardPosting.findMany({
      where: { jobId: job.id },
      include: {
        integration: {
          select: { id: true, board: true, isActive: true },
        },
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────

  private buildPublishInput(job: JobForPush): PublishJobInput {
    return {
      internalJobId: job.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      benefits: job.benefits ?? undefined,
      jobType: job.jobType,
      workMode: job.workMode,
      workAddresses: (job.workAddresses as PublishJobInput['workAddresses']) ?? [],
      experienceMin: job.experienceMin ?? undefined,
      experienceMax: job.experienceMax ?? undefined,
      salaryMin: job.salaryMin
        ? Number(job.salaryMin.toString())
        : undefined,
      salaryMax: job.salaryMax
        ? Number(job.salaryMax.toString())
        : undefined,
      salaryNegotiable: job.salaryNegotiable,
      currency: job.currency,
      requiredSkills: job.requiredSkills,
      niceToHaveSkills: job.niceToHaveSkills,
      headcount: job.headcount,
      isUrgent: job.isUrgent,
      expiresAt: job.expiresAt ?? undefined,
      externalUrl: this.buildJobUrl(job.slug),
    };
  }

  private buildJobUrl(slug: string): string {
    const base = (process.env.PUBLIC_APP_BASE_URL ?? '').replace(/\/+$/, '');
    if (!base) return `/recruitment/jobs/${slug}`;
    return `${base}/recruitment/jobs/${slug}`;
  }

  private async touchIntegration(id: string, lastError: string | null) {
    await this.prisma.jobBoardIntegration.update({
      where: { id },
      data: { lastSyncAt: new Date(), lastError },
    });
  }
}
