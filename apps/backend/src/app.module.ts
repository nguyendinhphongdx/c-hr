import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

import { configs } from './config';

import { AuditModule } from './common/audit';
import { ContextModule } from './common/context';
import { DatabaseModule } from './libs/database/database.module';
import { LoggerModule } from './libs/logger/logger.module';
import { RedisModule } from './libs/redis/redis.module';
import { MailModule } from './libs/mail/mail.module';
import { StorageModule } from './libs/storage';

import { AttendanceModule } from './apps/attendance/attendance.module';
import { CoreModule } from './apps/core/core.module';
import { HrmModule } from './apps/hrm/hrm.module';
import { RequestsModule } from './apps/requests/requests.module';

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

    CoreModule,
    HrmModule,
    AttendanceModule,
    RequestsModule,
  ],
})
export class AppModule {}
