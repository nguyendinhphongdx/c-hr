import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { CompleteTaskDto, ReassignTaskDto, UpdateTaskDto } from './dto';
import { OnboardingTaskService } from './onboarding-task.service';

@ApiTags('onboarding-tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding/tasks')
export class OnboardingTaskController {
  constructor(private readonly service: OnboardingTaskService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Auditable({ action: 'ONBOARDING_TASK_UPDATE', entity: 'OnboardingTask' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'ONBOARDING_TASK_COMPLETE', entity: 'OnboardingTask' })
  complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteTaskDto) {
    return this.service.complete(id, dto);
  }

  @Post(':id/uncomplete')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'ONBOARDING_TASK_UNCOMPLETE', entity: 'OnboardingTask' })
  uncomplete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.uncomplete(id);
  }

  @Patch(':id/reassign')
  @Auditable({ action: 'ONBOARDING_TASK_REASSIGN', entity: 'OnboardingTask' })
  reassign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReassignTaskDto) {
    return this.service.reassign(id, dto);
  }
}
