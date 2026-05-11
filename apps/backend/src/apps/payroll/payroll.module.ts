import { Module } from '@nestjs/common';

import { PayrollConfigModule } from './config/payroll-config.module';
import { PayrollItemModule } from './item/payroll-item.module';
import { PayrollPeriodModule } from './period/payroll-period.module';

/**
 * Payroll bounded context — F9.
 *
 * Phase 1A (done): PayrollConfig per-Org per-year + auto-seed defaults.
 * Phase 1B (done): pure-function calculator (no DI, see ./calculator).
 * Phase 2 (current): PayrollPeriod + PayrollItem services (open/close/pay).
 * Phase 3: FE list view.
 * Phase 4: Payslip PDF export.
 *
 * The calculator stack lives under `./calculator/` and is consumed as
 * pure imports by Phase 2 services — it is NOT exposed as a Nest module
 * on purpose (no DI, no decorators).
 */
@Module({
  imports: [PayrollConfigModule, PayrollPeriodModule, PayrollItemModule],
  exports: [PayrollConfigModule, PayrollPeriodModule, PayrollItemModule],
})
export class PayrollModule {}
