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

import {
  CreateTemplateDto,
  CreateTemplateTaskDto,
  ListTemplatesDto,
  ReorderTemplateTasksDto,
  UpdateTemplateDto,
  UpdateTemplateTaskDto,
} from './dto';
import { OnboardingTemplateService } from './onboarding-template.service';

/**
 * Two routing prefixes:
 *  - /onboarding/templates[/:id] — template CRUD + nested task list / reorder
 *  - /onboarding/template-tasks/:id — single template-task PATCH/DELETE
 */
@ApiTags('onboarding-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OnboardingTemplateController {
  constructor(private readonly service: OnboardingTemplateService) {}

  // ─── Template CRUD ────────────────────────────────────────────────

  @Get('onboarding/templates')
  list(@Query() query: ListTemplatesDto) {
    return this.service.list(query);
  }

  @Get('onboarding/templates/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post('onboarding/templates')
  @Auditable({ action: 'ONBOARDING_TEMPLATE_CREATE', entity: 'OnboardingTemplate' })
  create(@Body() dto: CreateTemplateDto) {
    return this.service.create(dto);
  }

  @Patch('onboarding/templates/:id')
  @Auditable({ action: 'ONBOARDING_TEMPLATE_UPDATE', entity: 'OnboardingTemplate' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.update(id, dto);
  }

  @Post('onboarding/templates/:id/archive')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'ONBOARDING_TEMPLATE_ARCHIVE', entity: 'OnboardingTemplate' })
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.archive(id);
  }

  @Delete('onboarding/templates/:id')
  @Auditable({ action: 'ONBOARDING_TEMPLATE_DELETE', entity: 'OnboardingTemplate' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }

  // ─── Template tasks ───────────────────────────────────────────────

  @Post('onboarding/templates/:id/tasks')
  @Auditable({ action: 'ONBOARDING_TEMPLATE_TASK_CREATE', entity: 'OnboardingTemplateTask' })
  addTask(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Body() dto: CreateTemplateTaskDto,
  ) {
    return this.service.addTask(templateId, dto);
  }

  @Put('onboarding/templates/:id/tasks/order')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'ONBOARDING_TEMPLATE_TASK_REORDER', entity: 'OnboardingTemplateTask' })
  reorderTasks(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Body() dto: ReorderTemplateTasksDto,
  ) {
    return this.service.reorderTasks(templateId, dto);
  }

  @Patch('onboarding/template-tasks/:id')
  @Auditable({ action: 'ONBOARDING_TEMPLATE_TASK_UPDATE', entity: 'OnboardingTemplateTask' })
  updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateTaskDto,
  ) {
    return this.service.updateTask(id, dto);
  }

  @Delete('onboarding/template-tasks/:id')
  @Auditable({ action: 'ONBOARDING_TEMPLATE_TASK_DELETE', entity: 'OnboardingTemplateTask' })
  deleteTask(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteTask(id);
  }
}
