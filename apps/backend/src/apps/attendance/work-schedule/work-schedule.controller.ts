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
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { CreateWorkScheduleDto, UpdateWorkScheduleDto } from './dto';
import { WorkScheduleService } from './work-schedule.service';

@ApiTags('work-schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('work-schedules')
export class WorkScheduleController {
  constructor(private readonly service: WorkScheduleService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auditable({ action: 'WORK_SCHEDULE_CREATE', entity: 'WorkSchedule' })
  create(@Body() dto: CreateWorkScheduleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auditable({ action: 'WORK_SCHEDULE_UPDATE', entity: 'WorkSchedule' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWorkScheduleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'WORK_SCHEDULE_DELETE', entity: 'WorkSchedule' })
  softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}
