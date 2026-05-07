import { Module } from '@nestjs/common';

import { EventModule } from './event/event.module';
import { ResourceModule } from './resource/resource.module';

/**
 * Calendar bounded context (F7) — events + resources + (future) follow,
 * external sync. Calendar is a unified render layer; F5 leave + F3
 * shifts get rendered through their respective adapters in FE.
 *
 * Phase 7.1 — Event + EventAttendee.
 * Phase 7.2 — Resource + EventResource (room/equipment/vehicle booking).
 */
@Module({
  imports: [EventModule, ResourceModule],
  exports: [EventModule, ResourceModule],
})
export class CalendarModule {}
