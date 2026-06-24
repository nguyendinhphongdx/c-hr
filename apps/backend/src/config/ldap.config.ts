import { registerAs } from '@nestjs/config';

export default registerAs('ldap', () => ({
  url: process.env.LDAP_URL || '',
  bindDn: process.env.LDAP_BIND_DN || '',
  bindPassword: process.env.LDAP_BIND_PASSWORD || '',
  baseDn: process.env.LDAP_BASE_DN || '',
  defaultOrganizationId: process.env.LDAP_DEFAULT_ORGANIZATION_ID || '',
  userDomain: process.env.LDAP_USER_DOMAIN || '',
  userFilter:
    process.env.LDAP_USER_FILTER ||
    '(&(objectCategory=person)(objectClass=user)(|(sAMAccountName={{username}})(userPrincipalName={{principal}})(mail={{principal}})))',
  startTls: process.env.LDAP_START_TLS === 'true',
  caFile: process.env.LDAP_CA_FILE || '',
  rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false',
  timeoutMs: Number(process.env.LDAP_TIMEOUT_MS || 5000),
}));
