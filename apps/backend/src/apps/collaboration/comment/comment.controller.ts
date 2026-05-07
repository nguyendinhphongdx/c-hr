import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ObjectLoaderRegistry } from '@/apps/collaboration/registry/object-loader.registry';
import { RequestContextService } from '@/common/context';
import { JwtAuthGuard } from '@/common/guards';
import { decodeObjectRef } from '@/common/object-ref';
import { ParseUUIDPipe } from '@/common/pipes';

import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentController {
  constructor(
    private readonly service: CommentService,
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
    const { objectType, objectId } = this.decode(token);
    const orgId = this.ctx.requireOrg();
    const { entry, row } = await this.registry.resolve(objectType, orgId, objectId);
    if (!entry) {
      throw new BadRequestException(`Unknown objectType "${objectType}"`);
    }
    if (!row) throw new NotFoundException(`${objectType} not found`);

    let includeInternal = true;
    if (entry.Acl) {
      const acl = new entry.Acl(row);
      await acl.require('canView');
      const view = (await acl.getAcl()) as Record<string, unknown>;
      includeInternal = (view.canViewInternal as boolean | undefined) ?? false;
    }

    return this.service.listFor(orgId, objectType, objectId, {
      includeInternal,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Post()
  async create(@Body() dto: CreateCommentDto) {
    const { objectType, objectId } = this.decode(dto.token);
    const orgId = this.ctx.requireOrg();
    const { entry, row } = await this.registry.resolve(objectType, orgId, objectId);
    if (!entry) {
      throw new BadRequestException(`Unknown objectType "${objectType}"`);
    }
    if (!row) throw new NotFoundException(`${objectType} not found`);

    if (entry.Acl) {
      await new entry.Acl(row).require('canView');
    }

    return this.service.create({
      organizationId: orgId,
      objectType,
      objectId,
      userId: this.ctx.requireUserId(),
      bodyHtml: dto.bodyHtml,
      parentId: dto.parentId,
      isInternal: dto.isInternal,
      mentions: dto.mentions,
    });
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCommentDto) {
    return this.service.update(id, this.ctx.requireUserId(), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.softDelete(id, this.ctx.requireUserId(), false);
    return { id, success: true };
  }

  private decode(token: string): { objectType: string; objectId: string } {
    try {
      return decodeObjectRef(token);
    } catch {
      throw new BadRequestException('Malformed objectRef token');
    }
  }
}
