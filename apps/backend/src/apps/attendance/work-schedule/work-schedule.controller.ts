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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { CurrentUser } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';
import { RequestUser } from '@/common/types';

import { CreateWorkScheduleDto, UpdateWorkScheduleDto } from './dto';
import { WorkScheduleService } from './work-schedule.service';

@ApiTags('work-schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('work-schedules')
export class WorkScheduleController {
  constructor(private readonly service: WorkScheduleService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.list(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Auditable({ action: 'WORK_SCHEDULE_CREATE', entity: 'WorkSchedule' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWorkScheduleDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Auditable({ action: 'WORK_SCHEDULE_UPDATE', entity: 'WorkSchedule' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkScheduleDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'WORK_SCHEDULE_DELETE', entity: 'WorkSchedule' })
  softDelete(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(user, id);
  }
}
