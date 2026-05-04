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

import { CoreModule } from './apps/core/core.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: ['.env.local', '.env'],
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
  ],
})
export class AppModule {}
