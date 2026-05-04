import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

import { AUDIT_EVENT, AuditWritePayload } from './audit.interceptor';

/**
 * Listens for `audit.write` events and persists them to audit_logs.
 * Async — handler returns immediately, write happens in the background
 * so a slow DB never blocks the originating request.
 *
 * Errors are logged and swallowed: an audit failure must never propagate
 * back to the request that succeeded.
 */
@Injectable()
export class AuditWriter {
  private readonly logger = new Logger(AuditWriter.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(AUDIT_EVENT, { async: true })
  async handle(payload: AuditWritePayload) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: payload.action,
          entityType: payload.entityType,
          entityId: payload.entityId,
          organizationId: payload.organizationId,
          actorUserId: payload.actorUserId,
          actorIpAddress: payload.actorIpAddress,
          actorUserAgent: payload.actorUserAgent,
          metadata: payload.metadata as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      this.logger.error(`audit write failed: ${(e as Error).message}`);
    }
  }
}
