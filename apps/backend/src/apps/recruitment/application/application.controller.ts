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

import { ApplicationService } from './application.service';
import {
  CreateApplicationDto,
  ListApplicationsDto,
  MoveStageDto,
  RejectApplicationDto,
} from './dto';

@ApiTags('applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationController {
  constructor(private readonly service: ApplicationService) {}

  @Get()
  list(@Query() query: ListApplicationsDto) {
    return this.service.list(query);
  }

  @Post()
  @Auditable({ action: 'APPLICATION_CREATE', entity: 'Application' })
  create(@Body() dto: CreateApplicationDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/move-stage')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'APPLICATION_MOVE_STAGE', entity: 'Application' })
  moveStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveStageDto,
  ) {
    return this.service.moveStage(id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'APPLICATION_REJECT', entity: 'Application' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.service.reject(id, dto);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'APPLICATION_WITHDRAW', entity: 'Application' })
  withdraw(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.withdraw(id);
  }
}
