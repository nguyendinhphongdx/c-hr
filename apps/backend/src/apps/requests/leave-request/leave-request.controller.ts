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

import { CreateLeaveRequestDto, DecideLeaveRequestDto, ListLeaveRequestsDto } from './dto';
import { LeaveRequestService } from './leave-request.service';

@ApiTags('leave-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave-requests')
export class LeaveRequestController {
  constructor(private readonly service: LeaveRequestService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListLeaveRequestsDto) {
    return this.service.list(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Auditable({ action: 'LEAVE_REQUEST_CREATE', entity: 'LeaveRequest' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateLeaveRequestDto) {
    return this.service.create(user, dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'LEAVE_REQUEST_APPROVE', entity: 'LeaveRequest' })
  approve(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideLeaveRequestDto,
  ) {
    return this.service.approve(user, id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'LEAVE_REQUEST_REJECT', entity: 'LeaveRequest' })
  reject(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideLeaveRequestDto,
  ) {
    return this.service.reject(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'LEAVE_REQUEST_CANCEL', entity: 'LeaveRequest' })
  cancel(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(user, id);
  }
}
