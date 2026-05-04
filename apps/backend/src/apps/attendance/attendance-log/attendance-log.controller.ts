import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { ListLogsQueryDto, UpdateAttendanceLogDto } from './dto';
import { AttendanceLogService } from './attendance-log.service';

@ApiTags('attendance-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance-logs')
export class AttendanceLogController {
  constructor(private readonly service: AttendanceLogService) {}

  @Get()
  list(@Query() query: ListLogsQueryDto) {
    return this.service.list(query);
  }

  @Patch(':id')
  @Auditable({ action: 'ATTENDANCE_LOG_UPDATE', entity: 'AttendanceLog' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAttendanceLogDto) {
    return this.service.update(id, dto);
  }
}
