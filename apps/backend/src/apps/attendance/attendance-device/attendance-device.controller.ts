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
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { CreateAttendanceDeviceDto, PushAttendanceDto, UpdateAttendanceDeviceDto } from './dto';
import { AttendanceDeviceService } from './attendance-device.service';

@ApiTags('attendance-devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance-devices')
export class AttendanceDeviceController {
  constructor(private readonly service: AttendanceDeviceService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  /**
   * Re-sign the current JWT for this device. Token can be retrieved any time
   * — the create modal no longer needs "show once" UX.
   */
  @Get(':id/token')
  getToken(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getToken(id);
  }

  @Post()
  @Auditable({ action: 'ATTENDANCE_DEVICE_CREATE', entity: 'AttendanceDevice' })
  create(@Body() dto: CreateAttendanceDeviceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auditable({ action: 'ATTENDANCE_DEVICE_UPDATE', entity: 'AttendanceDevice' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAttendanceDeviceDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/regenerate-token')
  @Auditable({
    action: 'ATTENDANCE_DEVICE_REGENERATE_TOKEN',
    entity: 'AttendanceDevice',
  })
  regenerateToken(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.regenerateToken(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'ATTENDANCE_DEVICE_DELETE', entity: 'AttendanceDevice' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  /**
   * Public push endpoint. Authenticated by JWT in body (token contains
   * deviceId + version, signed by server). Returns a small summary so the
   * bridge can log accepted vs. duplicate vs. unknown-employee counts.
   */
  @Public()
  @Post('push')
  @HttpCode(HttpStatus.OK)
  push(@Body() dto: PushAttendanceDto) {
    return this.service.push(dto);
  }
}
