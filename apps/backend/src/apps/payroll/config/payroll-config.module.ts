import { Module } from '@nestjs/common';

import { PayrollConfigController } from './payroll-config.controller';
import { PayrollConfigRepository } from './payroll-config.repository';
import { PayrollConfigService } from './payroll-config.service';

@Module({
  controllers: [PayrollConfigController],
  providers: [PayrollConfigService, PayrollConfigRepository],
  exports: [PayrollConfigService, PayrollConfigRepository],
})
export class PayrollConfigModule {}
