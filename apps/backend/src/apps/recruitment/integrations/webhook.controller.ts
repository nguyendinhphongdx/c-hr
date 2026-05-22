import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { JobBoard } from '@prisma/client';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { ParseUUIDPipe } from '@/common/pipes';

import { WebhookService } from './webhook.service';

/**
 * Inbound job-board webhooks. Public (no JWT) — auth happens via the
 * HMAC signature header verified inside the service. URL embeds the
 * `integrationId` so we can find the secret + tenant in one lookup.
 *
 * Excluded from Swagger because the spec is owned by each board.
 */
@ApiExcludeController()
@Controller('webhooks/recruitment')
export class WebhookController {
  constructor(private readonly service: WebhookService) {}

  @Post(':board/:integrationId')
  @HttpCode(HttpStatus.OK)
  async ingest(
    @Param('board') board: string,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('rawBody not available — bootstrap mis-configured');
    }
    const upper = board.toUpperCase().replace(/-/g, '_');
    if (!isJobBoard(upper)) {
      throw new BadRequestException(`Unknown board "${board}"`);
    }
    return this.service.handle(integrationId, upper, req.rawBody, req.headers);
  }
}

function isJobBoard(value: string): value is JobBoard {
  return value === 'TALENT_VN' || value === 'TOPCV' || value === 'ITVIEC';
}
