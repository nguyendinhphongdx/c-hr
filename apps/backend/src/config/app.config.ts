import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'NestJS API',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  apiBaseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  /** Externally-reachable origin of the backend (used to build OAuth
   *  redirect_uri etc.). Falls back to apiBaseURL — set explicitly in
   *  any deployment behind a reverse proxy. */
  publicApiUrl: process.env.PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:8000',
  /** Externally-reachable origin of the frontend (used to redirect
   *  after SSO callback). */
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigin: process.env.CORS_ORIGIN || '',
  cookieDomain: process.env.COOKIE_DOMAIN || '',
}));
