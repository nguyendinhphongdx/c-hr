import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';

import { UpdateConfigDto } from './dto';
import { PayrollConfigService } from './payroll-config.service';

@ApiTags('payroll-config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payroll/config')
export class PayrollConfigController {
  constructor(private readonly service: PayrollConfigService) {}

  /** Read config for `year` (defaults to current year). Auto-seeds on first hit. */
  @Get()
  get(@Query('year') yearStr?: string) {
    const year = yearStr ? Number.parseInt(yearStr, 10) : new Date().getFullYear();
    return this.service.get(year);
  }

  /** All years configured for the caller's Org — useful for a year picker. */
  @Get('list')
  list() {
    return this.service.listAll();
  }

  @Patch()
  @Auditable({ action: 'PAYROLL_CONFIG_UPDATE', entity: 'PayrollConfig' })
  update(@Query('year') yearStr: string, @Body() dto: UpdateConfigDto) {
    const year = Number.parseInt(yearStr, 10);
    return this.service.update(year, dto);
  }
}
