import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PreferenceScope } from '@prisma/client';

import { PREF_REGISTRY } from './preference.registry';
import { PreferenceRepository } from './preference.repository';
import type { PreferenceValue } from './preference.types';

/**
 * Generic per-user/per-org/per-employee key/value store. Keys + their
 * default values + zod validation live in `preference.registry.ts`.
 * Wire shape on disk: `value` JSONB is always `{ value: T }` so the
 * column shape is uniform. Callers exchange raw `T`.
 */
@Injectable()
export class PreferenceService {
  constructor(private readonly repo: PreferenceRepository) {}

  async get<T>(scope: PreferenceScope, scopeId: string, key: string): Promise<T> {
    const def = PREF_REGISTRY[key as keyof typeof PREF_REGISTRY];
    if (!def) {
      throw new BadRequestException(`Unknown preference key "${key}"`);
    }
    const row = await this.repo.findOne(scope, scopeId, key);
    if (!row) return def.defaultValue as T;
    return (row.value as unknown as PreferenceValue<T>).value;
  }

  async set(scope: PreferenceScope, scopeId: string, key: string, value: unknown): Promise<void> {
    const def = PREF_REGISTRY[key as keyof typeof PREF_REGISTRY];
    if (!def) {
      throw new BadRequestException(`Unknown preference key "${key}"`);
    }
    if (def.scope !== scope) {
      throw new BadRequestException(
        `Preference "${key}" must be scoped to ${def.scope}, got ${scope}`,
      );
    }
    const parsed = def.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException(
        `Invalid value for "${key}": ${parsed.error.issues.map((i) => i.message).join(', ')}`,
      );
    }
    const wrapped = { value: parsed.data } as Prisma.InputJsonValue;
    await this.repo.upsert(scope, scopeId, key, wrapped);
  }

  /** Bulk read — used by /me to surface every USER pref the actor has. */
  async getAll(scope: PreferenceScope, scopeId: string): Promise<Record<string, unknown>> {
    const rows = await this.repo.findManyByScope(scope, scopeId);
    const out: Record<string, unknown> = {};
    // Seed with registry defaults for the requested scope so callers
    // always see the full set of keys without a separate config fetch.
    for (const [key, def] of Object.entries(PREF_REGISTRY)) {
      if (def.scope === scope) out[key] = def.defaultValue;
    }
    for (const row of rows) {
      out[row.key] = (row.value as unknown as PreferenceValue).value;
    }
    return out;
  }
}
