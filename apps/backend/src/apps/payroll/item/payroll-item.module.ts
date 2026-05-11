import { Module } from '@nestjs/common';

import { PayrollConfigModule } from '../config/payroll-config.module';
import { PayrollPeriodModule } from '../period/payroll-period.module';

import { PayrollItemController } from './payroll-item.controller';
import { PayrollItemRepository } from './payroll-item.repository';
import { PayrollItemService } from './payroll-item.service';

@Module({
  imports: [PayrollConfigModule, PayrollPeriodModule],
  controllers: [PayrollItemController],
  providers: [PayrollItemService, PayrollItemRepository],
  exports: [PayrollItemService, PayrollItemRepository],
})
export class PayrollItemModule {}
