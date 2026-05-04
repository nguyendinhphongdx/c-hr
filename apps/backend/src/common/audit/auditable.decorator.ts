import { SetMetadata } from '@nestjs/common';

export const AUDITABLE_KEY = 'audit:meta';

export interface AuditableOptions {
  /** Verb-style action label, e.g. 'APP_ADMIN_GRANT', 'LEAVE_APPROVE'. */
  action: string;
  /** Entity name written to audit_logs.entity_type, e.g. 'AppAdmin'. */
  entity: string;
}

/**
 * Mark a controller route as audit-relevant. AuditInterceptor reads this
 * and emits an audit.write event after the handler succeeds.
 *
 * See docs/decisions/0002-audit-log.md.
 */
export const Auditable = (opts: AuditableOptions) => SetMetadata(AUDITABLE_KEY, opts);
