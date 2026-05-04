import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { IAuthTokens } from '@/common/types';

export interface AuthCookieConfig {
  accessName: string;
  refreshName: string;
  domain?: string;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
}

export function getAuthCookieConfig(configService: ConfigService): AuthCookieConfig {
  return {
    accessName: configService.get<string>('auth.cookie.accessName', 'access_token'),
    refreshName: configService.get<string>('auth.cookie.refreshName', 'refresh_token'),
    domain: configService.get<string>('auth.cookie.domain'),
    secure: configService.get<boolean>('auth.cookie.secure', false),
    sameSite: configService.get<'lax' | 'strict' | 'none'>('auth.cookie.sameSite', 'lax'),
  };
}

/**
 * Convert a duration string (e.g. "15m", "7d") or a raw seconds number to milliseconds.
 * Supported suffixes: s, m, h, d.
 */
function durationToMs(value: string | number): number {
  if (typeof value === 'number') return value * 1000;
  const match = /^(\d+)\s*([smhd])$/.exec(value.trim());
  if (!match) return Number(value) * 1000 || 0;
  const n = Number(match[1]);
  switch (match[2]) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60_000;
    case 'h':
      return n * 3_600_000;
    case 'd':
      return n * 86_400_000;
  }
  return 0;
}

function baseCookieOptions(cfg: AuthCookieConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: cfg.secure,
    sameSite: cfg.sameSite,
    domain: cfg.domain,
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: IAuthTokens,
  configService: ConfigService,
): void {
  const cfg = getAuthCookieConfig(configService);
  const accessMaxAge = durationToMs(configService.get<string>('auth.jwtAccessExpiration', '15m'));
  const refreshMaxAge = durationToMs(configService.get<string>('auth.jwtRefreshExpiration', '7d'));

  res.cookie(cfg.accessName, tokens.accessToken, {
    ...baseCookieOptions(cfg),
    maxAge: accessMaxAge,
  });
  res.cookie(cfg.refreshName, tokens.refreshToken, {
    ...baseCookieOptions(cfg),
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(res: Response, configService: ConfigService): void {
  const cfg = getAuthCookieConfig(configService);
  const opts = baseCookieOptions(cfg);
  res.clearCookie(cfg.accessName, opts);
  res.clearCookie(cfg.refreshName, opts);
}
