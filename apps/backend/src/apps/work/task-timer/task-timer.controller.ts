import {
  Body,
  Controller,
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

import { ListTimersDto, StartTimerDto, StopTimerDto, SummaryTimersDto } from './dto';
import { TaskTimerService } from './task-timer.service';

@ApiTags('task-timers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('task-timers')
export class TaskTimerController {
  constructor(private readonly service: TaskTimerService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'TASK_TIMER_START', entity: 'TaskTimer' })
  start(@Body() dto: StartTimerDto) {
    return this.service.start(dto);
  }

  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'TASK_TIMER_STOP', entity: 'TaskTimer' })
  stop(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StopTimerDto) {
    return this.service.stop(id, dto);
  }

  /** Caller's currently-running timer (or null). */
  @Get('current')
  current() {
    return this.service.current();
  }

  /** Aggregate minutes grouped by (userId, projectId) over the period. */
  @Get('summary')
  summary(@Query() query: SummaryTimersDto) {
    return this.service.summaryByUser(query);
  }

  @Get()
  list(@Query() query: ListTimersDto) {
    return this.service.list(query);
  }
}
