import { Module } from '@nestjs/common';

import { RequestGroupModule } from './request-group/request-group.module';
import { RequestModule } from './request/request.module';

/**
 * Requests bounded context (F5) — universal Request engine.
 *
 * RequestGroup defines the schema (system-wide); Request is the polymorphic
 * record (per-Org). Side-effects on approve dispatch via group code (xem
 * src/apps/requests/side-effects/registry.ts). See ADR 0006.
 */
@Module({
  imports: [RequestModule, RequestGroupModule],
  exports: [RequestModule, RequestGroupModule],
})
export class RequestsModule {}
