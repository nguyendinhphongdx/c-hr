import { registerAs } from '@nestjs/config';

/**
 * SSO config — shared multi-tenant Microsoft Entra app pattern.
 *
 * The SaaS deploy team registers ONE Entra app in their own Azure
 * tenant marked "Accounts in any organizational directory + personal
 * Microsoft accounts" (multi-tenant). The client_id / secret here are
 * the same for every C-HR Org — Entra itself picks the user's home
 * tenant at login time.
 *
 * To disable SSO in this deployment, leave clientId / clientSecret
 * empty — the /sso/entra/start endpoint will then refuse.
 */
export default registerAs('sso', () => ({
  microsoft: {
    /**
     * Authority tenant — typically `common` (any work/school account
     * + personal MS), or `organizations` (work/school only), or a
     * single tenant GUID to lock the SaaS to one customer.
     */
    tenantId: process.env.MS_SSO_TENANT_ID || 'common',
    clientId: process.env.MS_SSO_CLIENT_ID || '',
    clientSecret: process.env.MS_SSO_CLIENT_SECRET || '',
  },
}));
