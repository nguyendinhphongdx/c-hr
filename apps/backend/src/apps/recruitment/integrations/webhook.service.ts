import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JobBoard, Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

import { AdapterRegistry } from './adapter.registry';
import { decryptJson } from './lib/crypto';
import { BoardCredentials, IncomingApplication } from './adapter.interface';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: AdapterRegistry,
  ) {}

  /**
   * Entry point for inbound webhooks. Identifies the integration by
   * its `id` (path param), verifies HMAC, parses payload, and
   * upserts Candidate + Application.
   *
   * Returns a small acknowledgement so the board sees 200 OK quickly
   * — heavy lifting is fire-and-forget.
   */
  async handle(
    integrationId: string,
    board: JobBoard,
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const integration = await this.prisma.jobBoardIntegration.findUnique({
      where: { id: integrationId },
    });
    if (!integration) {
      throw new NotFoundException('Integration not found');
    }
    if (integration.board !== board) {
      throw new BadRequestException(
        `Integration ${integrationId} is not for board ${board}`,
      );
    }

    const credentials = decryptJson<BoardCredentials>(
      integration.credentialsEncrypted,
    );
    if (integration.webhookSecret && !credentials.webhookSecret) {
      credentials.webhookSecret = integration.webhookSecret;
    }

    const adapter = this.adapters.get(board);
    adapter.verifyWebhookSignature(rawBody, headers, credentials);

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }
    const { event, data } = adapter.parseWebhookEvent(payload);

    if (event !== 'application.created' || !data) {
      this.logger.log(
        `Ignoring ${board} event "${event}" — handler not implemented yet`,
      );
      return { event, received: true, ingested: false };
    }
    if (!data.candidate.email) {
      throw new BadRequestException('Webhook payload missing candidate email');
    }

    return this.ingestApplication(integration.id, integration.organizationId, board, data);
  }

  private async ingestApplication(
    integrationId: string,
    organizationId: string,
    board: JobBoard,
    incoming: IncomingApplication,
  ) {
    // Resolve internal job via the JobBoardPosting that owns the
    // externalJobId. If we can't find it, refuse — the board pushed
    // an application for a job we don't track.
    const posting = await this.prisma.jobBoardPosting.findFirst({
      where: { integrationId, externalId: incoming.externalJobId },
      include: { job: { select: { id: true, organizationId: true } } },
    });
    if (!posting || posting.job.organizationId !== organizationId) {
      throw new BadRequestException(
        `Unknown external job ${incoming.externalJobId}`,
      );
    }
    const jobId = posting.job.id;

    // Idempotency — if we've already ingested this externalApplicationId
    // for the same source, return the existing row.
    const sourceEnum = mapBoardToSource(board);
    if (incoming.externalApplicationId) {
      const dup = await this.prisma.application.findFirst({
        where: {
          organizationId,
          externalSource: sourceEnum,
          externalId: incoming.externalApplicationId,
        },
      });
      if (dup) return { received: true, ingested: false, applicationId: dup.id };
    }

    const email = incoming.candidate.email.trim().toLowerCase();
    const existingCandidate = await this.prisma.candidate.findFirst({
      where: { organizationId, email, deletedAt: null },
    });

    // Need a createdById on the Candidate row — use the integration creator
    // since the webhook isn't authenticated as a user.
    const integration = await this.prisma.jobBoardIntegration.findUnique({
      where: { id: integrationId },
      select: { createdById: true },
    });
    if (!integration) {
      throw new NotFoundException('Integration vanished mid-flight');
    }
    const candidate =
      existingCandidate ??
      (await this.prisma.candidate.create({
        data: {
          organizationId,
          fullName: incoming.candidate.fullName.trim() || email,
          email,
          phone: incoming.candidate.phone ?? null,
          headline: incoming.candidate.headline ?? null,
          location: incoming.candidate.location ?? null,
          linkedinUrl: incoming.candidate.linkedinUrl ?? null,
          source: sourceEnum,
          sourceMeta: {
            externalApplicationId: incoming.externalApplicationId ?? null,
          } as Prisma.JsonObject,
          createdById: integration.createdById,
        },
      }));

    // Resolve SOURCED stage for this job to seat the new application.
    const stage = await this.prisma.jobStage.findFirst({
      where: { jobId, kind: 'SOURCED' },
      orderBy: { order: 'asc' },
    });
    if (!stage) {
      throw new BadRequestException(
        'Job has no SOURCED stage — corrupted pipeline',
      );
    }

    // The unique (candidateId, jobId) constraint guards against
    // double-ingestion when the board retries.
    const existingApp = await this.prisma.application.findFirst({
      where: { candidateId: candidate.id, jobId },
    });
    if (existingApp) {
      return {
        received: true,
        ingested: false,
        applicationId: existingApp.id,
      };
    }

    const created = await this.prisma.application.create({
      data: {
        organizationId,
        candidateId: candidate.id,
        jobId,
        stageId: stage.id,
        coverLetter: incoming.candidate.coverLetter ?? null,
        expectedSalary: incoming.candidate.expectedSalary ?? null,
        appliedAt: incoming.appliedAt,
        externalId: incoming.externalApplicationId ?? null,
        externalSource: sourceEnum,
        stageHistory: [
          {
            fromStageId: null,
            toStageId: stage.id,
            userId: integration.createdById,
            reason: `Inbound from ${board}`,
            at: new Date().toISOString(),
          },
        ] as unknown as Prisma.JsonArray,
      },
    });

    await this.prisma.jobBoardIntegration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date(), lastError: null },
    });

    return {
      received: true,
      ingested: true,
      applicationId: created.id,
      candidateId: candidate.id,
    };
  }
}

function mapBoardToSource(board: JobBoard): 'TOPCV' | 'ITVIEC' | 'TALENT_VN' {
  switch (board) {
    case 'TOPCV':
      return 'TOPCV';
    case 'ITVIEC':
      return 'ITVIEC';
    case 'TALENT_VN':
      return 'TALENT_VN';
    default:
      throw new UnauthorizedException(`Unknown board ${board}`);
  }
}
