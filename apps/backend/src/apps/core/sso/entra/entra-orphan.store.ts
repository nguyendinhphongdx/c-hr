import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

import { RedisService } from '@libs/redis/redis.service';

/** Holds Microsoft profile data for users whose email doesn't yet
 *  belong to any Org. Issued by EntraSsoService.completeCallback when
 *  the SSO callback can't resolve a User, and consumed by the
 *  /no-org page + join-request submit endpoint.
 *
 *  Cookie-keyed (httpOnly) so an anonymous-but-authenticated-via-MS
 *  browser can come back without leaking the profile in the URL. */
export interface OrphanProfile {
  email: string;
  name: string | null;
  externalUserId: string;
  iat: number;
}

const TTL_SECONDS = 30 * 60;
const KEY_PREFIX = 'sso:entra:orphan:';

@Injectable()
export class EntraOrphanStore {
  constructor(private readonly redis: RedisService) {}

  async issue(profile: Omit<OrphanProfile, 'iat'>): Promise<string> {
    const token = crypto.randomBytes(24).toString('base64url');
    const full: OrphanProfile = { ...profile, iat: Date.now() };
    await this.redis.setJson(`${KEY_PREFIX}${token}`, full, TTL_SECONDS);
    return token;
  }

  /** Peek = read without deleting. Used by /sso/orphan/me + join-request
   *  endpoints which need the session to persist until user completes
   *  the flow (vs the one-shot `consume` pattern in state-store). */
  async peek(token: string): Promise<OrphanProfile | null> {
    return this.redis.getJson<OrphanProfile>(`${KEY_PREFIX}${token}`);
  }

  /** Explicit clear — called when user dismisses the /no-org page. */
  async revoke(token: string): Promise<void> {
    await this.redis.del(`${KEY_PREFIX}${token}`);
  }
}
