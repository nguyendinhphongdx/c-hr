import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { CreateFollowDto } from './dto';
import { FollowService } from './follow.service';

@ApiTags('calendar-follows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar-follows')
export class FollowController {
  constructor(private readonly service: FollowService) {}

  /** Who I am following — for picker rendering on the calendar. */
  @Get()
  list() {
    return this.service.listFollowing();
  }

  /** Who follows me — read-only V1. */
  @Get('followers')
  listFollowers() {
    return this.service.listFollowers();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Auditable({ action: 'CALENDAR_FOLLOW_CREATE', entity: 'CalendarFollow' })
  create(@Body() dto: CreateFollowDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'CALENDAR_FOLLOW_DELETE', entity: 'CalendarFollow' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
