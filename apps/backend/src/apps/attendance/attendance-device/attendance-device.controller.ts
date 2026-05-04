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
import { CurrentUser } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';
import { RequestUser } from '@/common/types';

import {
  CreateAttendanceDeviceDto,
  PushAttendanceDto,
  UpdateAttendanceDeviceDto,
} from './dto';
import { AttendanceDeviceService } from './attendance-device.service';

@ApiTags('attendance-devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance-devices')
export class AttendanceDeviceController {
  constructor(private readonly service: AttendanceDeviceService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.service.list(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Auditable({ action: 'ATTENDANCE_DEVICE_CREATE', entity: 'AttendanceDevice' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateAttendanceDeviceDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Auditable({ action: 'ATTENDANCE_DEVICE_UPDATE', entity: 'AttendanceDevice' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDeviceDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Post(':id/regenerate-token')
  @Auditable({
    action: 'ATTENDANCE_DEVICE_REGENERATE_TOKEN',
    entity: 'AttendanceDevice',
  })
  regenerateToken(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.regenerateToken(user, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'ATTENDANCE_DEVICE_DELETE', entity: 'AttendanceDevice' })
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user, id);
  }

  /**
   * Public push endpoint. Authenticated by deviceId + token in body — no
   * JWT. Returns a small summary so the device / bridge script can log
   * accepted vs. duplicate vs. unknown-employee counts.
   */
  @Public()
  @Post('push')
  @HttpCode(HttpStatus.OK)
  push(@Body() dto: PushAttendanceDto) {
    return this.service.push(dto);
  }
}
