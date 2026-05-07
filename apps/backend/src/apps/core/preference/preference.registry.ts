import { EventVisibility, PreferenceScope } from '@prisma/client';
import { z } from 'zod';

import type { PrefDef } from './preference.types';

/**
 * Single source of truth for known preference keys. Adding a new
 * setting = add an entry here; service uses it for default + zod
 * validation. Keep keys dot-notated (`<feature>.<setting>`).
 */
export const PREF_REGISTRY = {
  'calendar.visibility': {
    scope: PreferenceScope.USER,
    defaultValue: 'PUBLIC' as EventVisibility,
    schema: z.enum(['PUBLIC', 'PRIVATE', 'BUSY_ONLY']),
  },
} as const satisfies Record<string, PrefDef<unknown>>;

export type PreferenceRegistryKey = keyof typeof PREF_REGISTRY;
