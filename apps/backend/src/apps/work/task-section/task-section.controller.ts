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
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { CreateTaskSectionDto, ReorderSectionsDto, UpdateTaskSectionDto } from './dto';
import { TaskSectionService } from './task-section.service';

/**
 * Two routing prefixes:
 *  - GET/POST/PUT under /projects/:id/sections — project-scoped operations
 *  - PATCH/DELETE on /sections/:id — operate on a single section
 */
@ApiTags('task-sections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TaskSectionController {
  constructor(private readonly service: TaskSectionService) {}

  @Get('projects/:id/sections')
  list(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.service.list(projectId);
  }

  @Post('projects/:id/sections')
  @Auditable({ action: 'TASK_SECTION_CREATE', entity: 'TaskSection' })
  create(@Param('id', ParseUUIDPipe) projectId: string, @Body() dto: CreateTaskSectionDto) {
    return this.service.create(projectId, dto);
  }

  @Put('projects/:id/sections/order')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'TASK_SECTION_REORDER', entity: 'TaskSection' })
  reorder(@Param('id', ParseUUIDPipe) projectId: string, @Body() dto: ReorderSectionsDto) {
    return this.service.reorder(projectId, dto);
  }

  @Patch('sections/:id')
  @Auditable({ action: 'TASK_SECTION_UPDATE', entity: 'TaskSection' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskSectionDto) {
    return this.service.update(id, dto);
  }

  @Delete('sections/:id')
  @Auditable({ action: 'TASK_SECTION_DELETE', entity: 'TaskSection' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
