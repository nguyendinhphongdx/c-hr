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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { CreateTaskDto, ListTasksDto, ReorderTasksDto, UpdateTaskDto } from './dto';
import { TaskService } from './task.service';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TaskController {
  constructor(private readonly service: TaskService) {}

  @Get('tasks')
  list(@Query() query: ListTasksDto) {
    return this.service.list(query);
  }

  @Post('tasks')
  @Auditable({ action: 'TASK_CREATE', entity: 'Task' })
  create(@Body() dto: CreateTaskDto) {
    return this.service.create(dto);
  }

  /** Accepts either UUID or task code (e.g. "PRJ-15"). */
  @Get('tasks/:idOrCode')
  findOne(@Param('idOrCode') idOrCode: string) {
    return this.service.findOne(idOrCode);
  }

  @Patch('tasks/:id')
  @Auditable({ action: 'TASK_UPDATE', entity: 'Task' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.service.update(id, dto);
  }

  @Delete('tasks/:id')
  @Auditable({ action: 'TASK_DELETE', entity: 'Task' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }

  @Put('projects/:projectId/sections/:sectionId/order')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'TASK_REORDER', entity: 'Task' })
  reorder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: ReorderTasksDto,
  ) {
    return this.service.reorder(projectId, sectionId, dto);
  }

  @Post('tasks/:id/watch')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'TASK_WATCH', entity: 'Task' })
  watch(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.watch(id);
  }

  @Delete('tasks/:id/watch')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'TASK_UNWATCH', entity: 'Task' })
  unwatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.unwatch(id);
  }
}
