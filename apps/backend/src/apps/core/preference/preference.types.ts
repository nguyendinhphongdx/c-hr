import { PreferenceScope } from '@prisma/client';
import type { ZodTypeAny } from 'zod';

export { PreferenceScope };

/**
 * Stored row's `value` is always wrapped as `{ value: <T> }` so the JSONB
 * column shape stays uniform regardless of the underlying type. Callers
 * pass raw `T` to `set()` and read raw `T` from `get()` — wrapping is
 * internal to the service.
 */
export interface PreferenceValue<T = unknown> {
  value: T;
}

export interface PrefDef<T> {
  scope: PreferenceScope;
  defaultValue: T;
  schema: ZodTypeAny;
}

/** Known keys — string literal union so the registry stays exhaustive. */
export type PreferenceKey = 'calendar.visibility';
