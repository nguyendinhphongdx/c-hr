import { Module } from '@nestjs/common';

import { PayrollConfigModule } from './config/payroll-config.module';

/**
 * Payroll bounded context — F9.
 *
 * Phase 1A (current): PayrollConfig per-Org per-year + auto-seed defaults.
 * Phase 1B (current): pure-function calculator (no DI, see ./calculator).
 * Phase 2: PayrollPeriod + PayrollItem services (open/close/pay).
 * Phase 3: FE list view.
 * Phase 4: Payslip PDF export.
 *
 * The calculator stack lives under `./calculator/` and is consumed as
 * pure imports by Phase 2 services — it is NOT exposed as a Nest module
 * on purpose (no DI, no decorators).
 */
@Module({
  imports: [PayrollConfigModule],
  exports: [PayrollConfigModule],
})
export class PayrollModule {}
