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

import { CreateRequestDto, DecideRequestDto, ListRequestsDto } from './dto';
import { RequestService } from './request.service';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestController {
  constructor(private readonly service: RequestService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListRequestsDto) {
    return this.service.list(user, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Auditable({ action: 'REQUEST_CREATE', entity: 'Request' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRequestDto) {
    return this.service.create(user, dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'REQUEST_APPROVE', entity: 'Request' })
  approve(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideRequestDto,
  ) {
    return this.service.approve(user, id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'REQUEST_REJECT', entity: 'Request' })
  reject(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideRequestDto,
  ) {
    return this.service.reject(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'REQUEST_CANCEL', entity: 'Request' })
  cancel(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(user, id);
  }
}
