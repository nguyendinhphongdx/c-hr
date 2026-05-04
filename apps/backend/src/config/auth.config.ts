import { registerAs } from '@nestjs/config';

const ACCESS_COOKIE = process.env.AUTH_ACCESS_COOKIE_NAME || 'access_token';
const REFRESH_COOKIE = process.env.AUTH_REFRESH_COOKIE_NAME || 'refresh_token';

export default registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret',
  jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',

  cookie: {
    accessName: ACCESS_COOKIE,
    refreshName: REFRESH_COOKIE,
    domain: process.env.COOKIE_DOMAIN || undefined,
    // `secure` is auto-on in production (cross-site cookies require secure=true).
    secure:
      (process.env.COOKIE_SECURE ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')) ===
      'true',
    // 'lax' works for same-site, 'none' required for cross-site cookies (must pair with secure=true).
    sameSite: (process.env.COOKIE_SAMESITE || 'lax') as 'lax' | 'strict' | 'none',
  },
}));
