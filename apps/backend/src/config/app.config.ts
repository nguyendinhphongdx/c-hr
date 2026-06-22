import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'NestJS API',
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  /** Externally-reachable origin of THIS backend. Used to build OAuth
   *  redirect_uri (SSO Microsoft) and absolute file URLs (storage). In
   *  production behind a reverse proxy, set API_BASE_URL to the public
   *  origin (vd https://api.c-hr.com). Default points at the dev BE
   *  port. */
  apiBaseURL: process.env.API_BASE_URL || 'http://localhost:8000',
  /** Externally-reachable origin of the frontend. Used by the SSO
   *  callback to land the user back on the app UI after a successful
   *  token exchange. Typically a different origin from apiBaseURL
   *  (vd https://app.c-hr.com vs https://api.c-hr.com). */
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigin: process.env.CORS_ORIGIN || '',
  cookieDomain: process.env.COOKIE_DOMAIN || '',
}));
