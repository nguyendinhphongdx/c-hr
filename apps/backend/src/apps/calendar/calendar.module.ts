import { Module } from '@nestjs/common';

import { EventModule } from './event/event.module';

/**
 * Calendar bounded context (F7) — events + (future) resources, follow,
 * external sync. Calendar is a unified render layer; F5 leave + F3
 * shifts get rendered through their respective adapters in FE.
 *
 * MVP Phase 7.1 ships Event + EventAttendee only.
 */
@Module({
  imports: [EventModule],
  exports: [EventModule],
})
export class CalendarModule {}
