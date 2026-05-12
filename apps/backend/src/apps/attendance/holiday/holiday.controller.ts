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

import { CreateHolidayDto, ListHolidaysDto, UpdateHolidayDto } from './dto';
import { HolidayService } from './holiday.service';

@ApiTags('holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance/holidays')
export class HolidayController {
  constructor(private readonly service: HolidayService) {}

  @Get()
  list(@Query() query: ListHolidaysDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auditable({ action: 'HOLIDAY_CREATE', entity: 'Holiday' })
  create(@Body() dto: CreateHolidayDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auditable({ action: 'HOLIDAY_UPDATE', entity: 'Holiday' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHolidayDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'HOLIDAY_DELETE', entity: 'Holiday' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}
