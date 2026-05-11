import {
  Body,
  Controller,
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

import { ListItemsDto, UpdateItemDto } from './dto';
import { PayrollItemService } from './payroll-item.service';

@ApiTags('payroll-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollItemController {
  constructor(private readonly service: PayrollItemService) {}

  @Get('periods/:periodId/items')
  listForPeriod(@Param('periodId', ParseUUIDPipe) periodId: string, @Query() query: ListItemsDto) {
    return this.service.listForPeriod(periodId, query);
  }

  @Get('items/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch('items/:id')
  @Auditable({ action: 'PAYROLL_ITEM_UPDATE', entity: 'PayrollItem' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateItemDto) {
    return this.service.update(id, dto);
  }

  @Post('items/:id/recompute')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'PAYROLL_ITEM_RECOMPUTE', entity: 'PayrollItem' })
  recompute(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.recompute(id);
  }
}
