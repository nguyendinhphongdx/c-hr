import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { AddTaskDto, CreatePlanDto, ListPlansDto } from './dto';
import { OnboardingPlanService } from './onboarding-plan.service';

@ApiTags('onboarding-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding/plans')
export class OnboardingPlanController {
  constructor(private readonly service: OnboardingPlanService) {}

  @Get()
  list(@Query() query: ListPlansDto) {
    return this.service.list(query);
  }

  @Post()
  @Auditable({ action: 'ONBOARDING_PLAN_CREATE', entity: 'OnboardingPlan' })
  create(@Body() dto: CreatePlanDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get('by-employee/:employeeId')
  findByEmployee(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.service.findByEmployee(employeeId);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'ONBOARDING_PLAN_ARCHIVE', entity: 'OnboardingPlan' })
  archive(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.archive(id);
  }

  @Delete(':id')
  @Auditable({ action: 'ONBOARDING_PLAN_DELETE', entity: 'OnboardingPlan' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  @Post(':id/tasks')
  @Auditable({ action: 'ONBOARDING_TASK_CREATE', entity: 'OnboardingTask' })
  addTask(@Param('id', ParseUUIDPipe) planId: string, @Body() dto: AddTaskDto) {
    return this.service.addTask(planId, dto);
  }
}
