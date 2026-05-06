import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ObjectLoaderRegistry } from '@/apps/collaboration/registry/object-loader.registry';
import { RequestContextService } from '@/common/context';
import { JwtAuthGuard } from '@/common/guards';
import { decodeObjectRef } from '@/common/object-ref';

import { ActivityService } from './activity.service';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivityController {
  constructor(
    private readonly service: ActivityService,
    private readonly ctx: RequestContextService,
    private readonly registry: ObjectLoaderRegistry,
  ) {}

  @Get()
  async list(
    @Query('token') token: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    if (!token) throw new BadRequestException('token is required');
    let objectType: string;
    let objectId: string;
    try {
      ({ objectType, objectId } = decodeObjectRef(token));
    } catch {
      throw new BadRequestException('Malformed objectRef token');
    }

    const orgId = this.ctx.requireOrg();
    const { entry, row } = await this.registry.resolve(objectType, orgId, objectId);
    if (!entry) {
      throw new BadRequestException(`Unknown objectType "${objectType}"`);
    }
    if (!row) throw new NotFoundException(`${objectType} not found`);

    if (entry.Acl) {
      await new entry.Acl(row).require('canView');
    }

    return this.service.listFor(orgId, objectType, objectId, {
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }
}
