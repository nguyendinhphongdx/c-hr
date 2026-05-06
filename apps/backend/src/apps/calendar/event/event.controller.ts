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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import {
  CreateEventDto,
  ListEventsDto,
  RespondAttendeeDto,
  UpdateEventDto,
} from './dto';
import { EventService } from './event.service';

@ApiTags('events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventController {
  constructor(private readonly service: EventService) {}

  @Get()
  list(@Query() query: ListEventsDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auditable({ action: 'EVENT_CREATE', entity: 'Event' })
  create(@Body() dto: CreateEventDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auditable({ action: 'EVENT_UPDATE', entity: 'Event' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'EVENT_CANCEL', entity: 'Event' })
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id);
  }

  @Delete(':id')
  @Auditable({ action: 'EVENT_DELETE', entity: 'Event' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  /** Caller responds to their own invite on this event. */
  @Post(':id/respond')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'EVENT_RESPOND', entity: 'EventAttendee' })
  respond(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RespondAttendeeDto,
  ) {
    return this.service.respond(id, dto);
  }
}
