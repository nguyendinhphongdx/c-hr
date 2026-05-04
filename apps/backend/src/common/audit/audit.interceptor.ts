import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, tap } from 'rxjs';

import { AUDITABLE_KEY, AuditableOptions } from './auditable.decorator';

export const AUDIT_EVENT = 'audit.write';

export interface AuditWritePayload {
  action: string;
  entityType: string;
  entityId?: string | null;
  organizationId?: string | null;
  actorUserId?: string | null;
  actorIpAddress?: string | null;
  actorUserAgent?: string | null;
  metadata?: unknown;
}

/**
 * Global interceptor — emits an `audit.write` event after any @Auditable
 * route returns successfully. Failures are NOT logged (only successful
 * actions). Listener (AuditWriter) writes async via @nestjs/event-emitter.
 *
 * See docs/decisions/0002-audit-log.md.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly events: EventEmitter2,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const opts = this.reflector.get<AuditableOptions>(AUDITABLE_KEY, ctx.getHandler());
    if (!opts) return next.handle();

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { id?: string; organizationId?: string } | undefined;
    const actorUserId = user?.id ?? null;
    const organizationId = user?.organizationId ?? null;
    const actorIpAddress = req.ip ?? null;
    const actorUserAgent = (req.headers?.['user-agent'] as string | undefined) ?? null;

    return next.handle().pipe(
      tap((result) => {
        const payload: AuditWritePayload = {
          action: opts.action,
          entityType: opts.entity,
          entityId: extractId(result) ?? (req.params?.id as string | undefined) ?? null,
          organizationId,
          actorUserId,
          actorIpAddress,
          actorUserAgent,
          metadata: { body: redact(req.body), params: req.params },
        };
        this.events.emit(AUDIT_EVENT, payload);
      }),
    );
  }
}

function extractId(result: unknown): string | null {
  if (result && typeof result === 'object' && 'id' in result) {
    const id = (result as { id: unknown }).id;
    return typeof id === 'string' ? id : null;
  }
  return null;
}

/** Strip obviously sensitive fields. Extend the list as new audit-bearing
 * entities arrive (payroll amounts, secrets, etc.). */
function redact(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const SENSITIVE = new Set(['password', 'token', 'refreshToken', 'accessToken']);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    out[k] = SENSITIVE.has(k) ? '[redacted]' : v;
  }
  return out;
}
