import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, InvalidCredentialsError, type Entry } from 'ldapts';
import * as fs from 'node:fs';

import type { LdapProfile } from './ldap.types';

interface LdapConfig {
  url: string;
  bindDn: string;
  bindPassword: string;
  baseDn: string;
  defaultOrganizationId: string;
  userDomain: string;
  userFilter: string;
  startTls: boolean;
  caFile: string;
  rejectUnauthorized: boolean;
  timeoutMs: number;
}

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  constructor(private readonly configService: ConfigService) {}

  async authenticate(login: string, password: string): Promise<LdapProfile> {
    const config = this.getConfig();
    try {
      return await this.authenticateOnce(login, password, config);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        `LDAP authentication failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException('Không thể kết nối dịch vụ AD');
    }
  }

  private async authenticateOnce(
    login: string,
    password: string,
    config: LdapConfig,
  ): Promise<LdapProfile> {
    const directoryClient = this.createClient(config);
    try {
      await this.secureConnection(directoryClient, config);
      await directoryClient.bind(config.bindDn, config.bindPassword);

      const baseDn = config.baseDn || (await this.discoverBaseDn(directoryClient));
      const identity = this.normalizeIdentity(login, config.userDomain);
      const filter = config.userFilter
        .replaceAll('{{username}}', escapeLdapFilter(identity.username))
        .replaceAll('{{principal}}', escapeLdapFilter(identity.principal));

      const { searchEntries } = await directoryClient.search(baseDn, {
        scope: 'sub',
        filter,
        attributes: ['*', '+'],
        sizeLimit: 2,
      });

      if (searchEntries.length !== 1) {
        throw new UnauthorizedException('Tài khoản AD không tồn tại hoặc không duy nhất');
      }

      const entry = searchEntries[0];
      const userBindIdentity = firstString(entry.userPrincipalName) || entry.dn;
      await this.verifyPassword(userBindIdentity, password, config);
      return this.toProfile(entry, identity.principal);
    } finally {
      await directoryClient.unbind().catch(() => undefined);
    }
  }

  private async verifyPassword(
    userIdentity: string,
    password: string,
    config: LdapConfig,
  ): Promise<void> {
    const userClient = this.createClient(config);
    try {
      await this.secureConnection(userClient, config);
      await userClient.bind(userIdentity, password);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Tài khoản hoặc mật khẩu AD không đúng');
      }
      throw error;
    } finally {
      await userClient.unbind().catch(() => undefined);
    }
  }

  private async discoverBaseDn(client: Client): Promise<string> {
    const { searchEntries } = await client.search('', {
      scope: 'base',
      filter: '(objectClass=*)',
      attributes: ['defaultNamingContext'],
      sizeLimit: 1,
    });
    const baseDn = firstString(searchEntries[0]?.defaultNamingContext);
    if (!baseDn) {
      throw new ServiceUnavailableException(
        'LDAP_BASE_DN chưa cấu hình và server không cung cấp defaultNamingContext',
      );
    }
    return baseDn;
  }

  private createClient(config: LdapConfig): Client {
    return new Client({
      url: config.url,
      connectTimeout: config.timeoutMs,
      timeout: config.timeoutMs,
      ...(config.url.toLowerCase().startsWith('ldaps://')
        ? { tlsOptions: this.tlsOptions(config) }
        : {}),
    });
  }

  private async secureConnection(client: Client, config: LdapConfig): Promise<void> {
    if (config.startTls) {
      await client.startTLS(this.tlsOptions(config));
    }
  }

  private tlsOptions(config: LdapConfig) {
    return {
      rejectUnauthorized: config.rejectUnauthorized,
      ...(config.caFile ? { ca: [fs.readFileSync(config.caFile)] } : {}),
    };
  }

  private normalizeIdentity(login: string, domain: string) {
    const trimmed = login.trim();
    const withoutNetbios = trimmed.includes('\\') ? trimmed.split('\\').at(-1)! : trimmed;
    const username = withoutNetbios.includes('@') ? withoutNetbios.split('@')[0] : withoutNetbios;
    const principal = withoutNetbios.includes('@')
      ? withoutNetbios
      : domain
        ? `${withoutNetbios}@${domain}`
        : withoutNetbios;
    return { username, principal };
  }

  private toProfile(entry: Entry, fallbackPrincipal: string): LdapProfile {
    const principal = firstString(entry.userPrincipalName) || fallbackPrincipal;
    const email = (firstString(entry.mail) || principal).toLowerCase();
    return {
      dn: entry.dn,
      username: firstString(entry.sAMAccountName) || principal,
      email,
      name: firstString(entry.displayName) || null,
      title: firstString(entry.title) || null,
      phone: firstString(entry.mobile) || firstString(entry.telephoneNumber) || null,
      groups: stringArray(entry.memberOf),
      employeeId: firstString(entry.employeeID) || null,
      attendanceCode: firstString(entry.employeeID) || null,
    };
  }

  private getConfig(): LdapConfig {
    const config = this.configService.get<LdapConfig>('ldap');
    if (!config?.url || !config.bindDn || !config.bindPassword) {
      throw new ServiceUnavailableException(
        'LDAP chưa được cấu hình — thiếu URL hoặc tài khoản bind',
      );
    }
    return config;
  }
}

function firstString(value: Entry[string] | undefined): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? String(value[0]) : '';
  }
  return value ? String(value) : '';
}

function stringArray(value: Entry[string] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function escapeLdapFilter(value: string): string {
  return value.replace(/[\0()*\\]/g, (char) => {
    return `\\${char.charCodeAt(0).toString(16).padStart(2, '0')}`;
  });
}
