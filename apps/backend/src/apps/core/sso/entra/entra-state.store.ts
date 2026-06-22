import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

import { RedisService } from '@libs/redis/redis.service';

/** CSRF / replay protection for the OAuth round-trip. State token is
 *  generated on /sso/entra/start, embedded in the authorize URL, and
 *  validated (one-time) on /sso/entra/callback.
 *
 *  Payload travels with the state so the callback knows which Org / Entra
 *  tenant it relates to, even when the user is anonymous mid-flow. */
export interface EntraStatePayload {
  orgId: string;
  orgSlug: string;
  returnTo?: string;
  /** Used as PKCE-lite — bound to the original request's user-agent. */
  ua?: string;
  /** Created-at ms — backstop in case TTL expiry has clock drift. */
  iat: number;
}

const TTL_SECONDS = 10 * 60;
const KEY_PREFIX = 'sso:entra:state:';

@Injectable()
export class EntraStateStore {
  constructor(private readonly redis: RedisService) {}

  async issue(payload: Omit<EntraStatePayload, 'iat'>): Promise<string> {
    const token = crypto.randomBytes(24).toString('base64url');
    const full: EntraStatePayload = { ...payload, iat: Date.now() };
    await this.redis.setJson(`${KEY_PREFIX}${token}`, full, TTL_SECONDS);
    return token;
  }

  /** Consume = read then delete (one-time use). Returns null if missing/expired. */
  async consume(token: string): Promise<EntraStatePayload | null> {
    const key = `${KEY_PREFIX}${token}`;
    const payload = await this.redis.getJson<EntraStatePayload>(key);
    if (!payload) return null;
    await this.redis.del(key);
    return payload;
  }
}
