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

import { CreatePeriodDto, ListPeriodsDto, UpdatePeriodDto } from './dto';
import { PayrollPeriodService } from './payroll-period.service';

@ApiTags('payroll-periods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll/periods')
export class PayrollPeriodController {
  constructor(private readonly service: PayrollPeriodService) {}

  @Get()
  list(@Query() query: ListPeriodsDto) {
    return this.service.list(query);
  }

  @Post()
  @Auditable({ action: 'PAYROLL_PERIOD_CREATE', entity: 'PayrollPeriod' })
  create(@Body() dto: CreatePeriodDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Auditable({ action: 'PAYROLL_PERIOD_UPDATE', entity: 'PayrollPeriod' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePeriodDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'PAYROLL_PERIOD_CLOSE', entity: 'PayrollPeriod' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.close(id);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'PAYROLL_PERIOD_PAY', entity: 'PayrollPeriod' })
  pay(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.pay(id);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'PAYROLL_PERIOD_REOPEN', entity: 'PayrollPeriod' })
  reopen(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.reopen(id);
  }

  @Post(':id/recompute')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'PAYROLL_PERIOD_RECOMPUTE', entity: 'PayrollPeriod' })
  recompute(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.recomputeAll(id);
  }

  @Delete(':id')
  @Auditable({ action: 'PAYROLL_PERIOD_DELETE', entity: 'PayrollPeriod' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
