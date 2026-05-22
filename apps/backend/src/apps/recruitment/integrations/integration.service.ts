import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobBoard } from '@prisma/client';
import { randomBytes } from 'crypto';

import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { AdapterRegistry } from './adapter.registry';
import { BoardCredentials } from './adapter.interface';
import { UpsertIntegrationDto } from './dto';
import { decryptJson, encryptJson, maskTail } from './lib/crypto';

export interface IntegrationSummary {
  id: string;
  board: JobBoard;
  isActive: boolean;
  /** Masked preview, e.g. "•••••••• 12ab". Never the real token. */
  apiKeyPreview: string;
  hasWebhookSecret: boolean;
  lastSyncAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly adapters: AdapterRegistry,
  ) {}

  async list(): Promise<IntegrationSummary[]> {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const rows = await this.prisma.jobBoardIntegration.findMany({
      where: { organizationId: orgId },
      orderBy: { board: 'asc' },
    });
    return rows.map((row) => this.shape(row));
  }

  async upsert(dto: UpsertIntegrationDto): Promise<IntegrationSummary> {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    // Fail fast: if no adapter is implemented for this board, refuse
    // the save — would just be dead data sitting in the DB.
    if (!this.adapters.available().includes(dto.board)) {
      throw new BadRequestException(
        `Adapter for ${dto.board} is not implemented yet`,
      );
    }

    const creds: BoardCredentials = {
      apiKey: dto.apiKey.trim(),
      ...(dto.secretKey
        ? { secretKey: dto.secretKey.trim() }
        : {}),
      ...(dto.webhookSecret
        ? { webhookSecret: dto.webhookSecret.trim() }
        : {}),
    };

    const adapter = this.adapters.get(dto.board);
    try {
      await adapter.validateCredentials(creds);
    } catch (err) {
      throw new BadRequestException(
        `Credentials rejected by ${dto.board}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }

    const encrypted = encryptJson(creds);

    const existing = await this.prisma.jobBoardIntegration.findUnique({
      where: {
        organizationId_board: { organizationId: orgId, board: dto.board },
      },
    });

    const row = existing
      ? await this.prisma.jobBoardIntegration.update({
          where: { id: existing.id },
          data: {
            credentialsEncrypted: encrypted,
            webhookSecret: dto.webhookSecret ?? existing.webhookSecret,
            lastError: null,
          },
        })
      : await this.prisma.jobBoardIntegration.create({
          data: {
            organizationId: orgId,
            board: dto.board,
            credentialsEncrypted: encrypted,
            webhookSecret: dto.webhookSecret ?? this.generateWebhookSecret(),
            createdById: callerId,
          },
        });
    return this.shape(row);
  }

  async toggle(board: JobBoard): Promise<IntegrationSummary> {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const row = await this.prisma.jobBoardIntegration.findUnique({
      where: { organizationId_board: { organizationId: orgId, board } },
    });
    if (!row) throw new NotFoundException('Integration not found');

    const updated = await this.prisma.jobBoardIntegration.update({
      where: { id: row.id },
      data: { isActive: !row.isActive },
    });
    return this.shape(updated);
  }

  async remove(board: JobBoard): Promise<void> {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const existing = await this.prisma.jobBoardIntegration.findUnique({
      where: { organizationId_board: { organizationId: orgId, board } },
      select: { id: true, postings: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException('Integration not found');
    if (existing.postings.length > 0) {
      throw new ConflictException(
        'Integration has live job postings; close them on the board first',
      );
    }
    await this.prisma.jobBoardIntegration.delete({
      where: { id: existing.id },
    });
  }

  /**
   * Internal: hand the decrypted credentials to anything that needs to
   * call the board (push job, fetch applications, verify webhook).
   * Throws if the integration is missing or inactive.
   */
  async getCredentials(
    organizationId: string,
    board: JobBoard,
    { requireActive = true }: { requireActive?: boolean } = {},
  ): Promise<{ id: string; credentials: BoardCredentials; webhookSecret: string | null }> {
    const row = await this.prisma.jobBoardIntegration.findUnique({
      where: { organizationId_board: { organizationId, board } },
    });
    if (!row) {
      throw new NotFoundException(
        `No integration configured for ${board} in this org`,
      );
    }
    if (requireActive && !row.isActive) {
      throw new BadRequestException(`Integration for ${board} is disabled`);
    }
    const creds = decryptJson<BoardCredentials>(row.credentialsEncrypted);
    if (row.webhookSecret && !creds.webhookSecret) {
      creds.webhookSecret = row.webhookSecret;
    }
    return { id: row.id, credentials: creds, webhookSecret: row.webhookSecret };
  }

  private shape(row: {
    id: string;
    board: JobBoard;
    isActive: boolean;
    credentialsEncrypted: string;
    webhookSecret: string | null;
    lastSyncAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): IntegrationSummary {
    let preview = '••••';
    try {
      const creds = decryptJson<BoardCredentials>(row.credentialsEncrypted);
      preview = maskTail(creds.apiKey ?? '');
    } catch {
      // Credentials present but unreadable (env key rotated). Leave preview generic.
    }
    return {
      id: row.id,
      board: row.board,
      isActive: row.isActive,
      apiKeyPreview: preview,
      hasWebhookSecret: !!row.webhookSecret,
      lastSyncAt: row.lastSyncAt,
      lastError: row.lastError,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private generateWebhookSecret(): string {
    return `whsec_${randomBytes(24).toString('hex')}`;
  }
}
