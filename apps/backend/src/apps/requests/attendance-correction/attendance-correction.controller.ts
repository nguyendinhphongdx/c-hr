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
import { CurrentUser } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';
import { RequestUser } from '@/common/types';

import {
  CreateAttendanceCorrectionDto,
  DecideCorrectionDto,
  ListCorrectionsDto,
} from './dto';
import { AttendanceCorrectionService } from './attendance-correction.service';

@ApiTags('attendance-corrections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance-corrections')
export class AttendanceCorrectionController {
  constructor(private readonly service: AttendanceCorrectionService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListCorrectionsDto) {
    return this.service.list(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Auditable({ action: 'ATTENDANCE_CORRECTION_CREATE', entity: 'AttendanceCorrection' })
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAttendanceCorrectionDto,
  ) {
    return this.service.create(user, dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'ATTENDANCE_CORRECTION_APPROVE', entity: 'AttendanceCorrection' })
  approve(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideCorrectionDto,
  ) {
    return this.service.approve(user, id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'ATTENDANCE_CORRECTION_REJECT', entity: 'AttendanceCorrection' })
  reject(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideCorrectionDto,
  ) {
    return this.service.reject(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'ATTENDANCE_CORRECTION_CANCEL', entity: 'AttendanceCorrection' })
  cancel(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(user, id);
  }
}
