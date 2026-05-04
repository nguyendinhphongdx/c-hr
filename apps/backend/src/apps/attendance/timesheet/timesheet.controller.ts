import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';

import { TimesheetQueryDto } from './dto';
import { TimesheetService } from './timesheet.service';

@ApiTags('timesheet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('timesheet')
export class TimesheetController {
  constructor(private readonly service: TimesheetService) {}

  @Get()
  get(@Query() query: TimesheetQueryDto) {
    return this.service.get(query);
  }
}
