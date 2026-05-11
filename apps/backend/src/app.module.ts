import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { configs } from './config';

import { AuditModule } from './common/audit';
import { ContextModule } from './common/context';
import { ImportModule } from './common/import';
import { DatabaseModule } from './libs/database/database.module';
import { LoggerModule } from './libs/logger/logger.module';
import { RedisModule } from './libs/redis/redis.module';
import { MailModule } from './libs/mail/mail.module';
import { StorageModule } from './libs/storage';

import { AttendanceModule } from './apps/attendance/attendance.module';
import { CalendarModule } from './apps/calendar/calendar.module';
import { CollaborationModule } from './apps/collaboration/collaboration.module';
import { CoreModule } from './apps/core/core.module';
import { HrmModule } from './apps/hrm/hrm.module';
import { OnboardingModule } from './apps/onboarding/onboarding.module';
import { PayrollModule } from './apps/payroll/payroll.module';
import { RequestsModule } from './apps/requests/requests.module';
import { WorkModule } from './apps/work/work.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      // Load order (first wins): app-local overrides → app shared → repo
      // root (shared with docker-compose). Lets contributors put common
      // values once in /.env instead of duplicating across BE + compose.
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),

    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    ContextModule,
    DatabaseModule,
    LoggerModule,
    RedisModule,
    MailModule,
    StorageModule,
    AuditModule,
    ImportModule,

    CoreModule,
    HrmModule,
    AttendanceModule,
    RequestsModule,
    CollaborationModule,
    CalendarModule,
    WorkModule,
    PayrollModule,
    OnboardingModule,
  ],
})
export class AppModule {}
