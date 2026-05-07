import { Module } from '@nestjs/common';

import { EventModule } from './event/event.module';
import { FollowModule } from './follow/follow.module';
import { ResourceModule } from './resource/resource.module';

/**
 * Calendar bounded context (F7) — events + resources + follow.
 * Calendar is a unified render layer; F5 leave + F3 shifts get rendered
 * through their respective adapters in FE.
 *
 * Phase 7.1 — Event + EventAttendee.
 * Phase 7.2 — Resource + EventResource (room/equipment/vehicle booking).
 * Phase 7.3 — CalendarFollow + per-user default visibility (settings).
 */
@Module({
  imports: [EventModule, ResourceModule, FollowModule],
  exports: [EventModule, ResourceModule, FollowModule],
})
export class CalendarModule {}
