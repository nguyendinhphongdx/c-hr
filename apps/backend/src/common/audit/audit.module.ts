import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuditInterceptor } from './audit.interceptor';
import { AuditWriter } from './audit.writer';

/**
 * Global audit infra per ADR 0002. Provides:
 *   - AuditInterceptor (APP_INTERCEPTOR): reads @Auditable metadata and
 *     emits audit.write after successful handlers.
 *   - AuditWriter: @OnEvent listener that persists to audit_logs.
 *
 * EventEmitterModule.forRoot() is wired in app.module.ts.
 */
@Global()
@Module({
  providers: [
    AuditWriter,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AuditModule {}
