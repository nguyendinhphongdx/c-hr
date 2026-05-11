import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { CreateProjectDto, ListProjectsDto, TransferOwnershipDto, UpdateProjectDto } from './dto';
import { ProjectService } from './project.service';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly service: ProjectService) {}

  @Get()
  list(@Query() query: ListProjectsDto) {
    return this.service.list(query);
  }

  @Post()
  @Auditable({ action: 'PROJECT_CREATE', entity: 'Project' })
  create(@Body() dto: CreateProjectDto) {
    return this.service.create(dto);
  }

  /** Accepts either UUID or slug. Slug is `[A-Z0-9]{3,8}`. */
  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.service.findOne(idOrSlug);
  }

  @Patch(':id')
  @Auditable({ action: 'PROJECT_UPDATE', entity: 'Project' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Auditable({ action: 'PROJECT_DELETE', entity: 'Project' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'PROJECT_ARCHIVE', entity: 'Project' })
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.archive(id);
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'PROJECT_UNARCHIVE', entity: 'Project' })
  unarchive(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.unarchive(id);
  }

  @Post(':id/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'PROJECT_TRANSFER_OWNERSHIP', entity: 'Project' })
  transferOwnership(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TransferOwnershipDto) {
    return this.service.transferOwnership(id, dto);
  }
}
