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

import { CreateRequestDto, DecideRequestDto, ListRequestsDto } from './dto';
import { RequestService } from './request.service';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('requests')
export class RequestController {
  constructor(private readonly service: RequestService) {}

  @Get()
  list(@Query() query: ListRequestsDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auditable({ action: 'REQUEST_CREATE', entity: 'Request' })
  create(@Body() dto: CreateRequestDto) {
    return this.service.create(dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'REQUEST_APPROVE', entity: 'Request' })
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideRequestDto) {
    return this.service.approve(id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'REQUEST_REJECT', entity: 'Request' })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideRequestDto) {
    return this.service.reject(id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'REQUEST_CANCEL', entity: 'Request' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id);
  }
}
