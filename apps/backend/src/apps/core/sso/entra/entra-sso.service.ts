import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrgSsoConfig, Role, SsoProvider } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

import { AuthService } from '../../auth/auth.service';
import { SsoConfigService } from '../sso-config.service';
import { EntraStateStore } from './entra-state.store';

interface MicrosoftGraphMe {
  id: string; // Entra `oid` claim
  mail: string | null;
  userPrincipalName: string;
  displayName: string | null;
}

/**
 * Authorization-code OAuth flow against Microsoft Entra ID. We exchange
 * code → access_token and then call Microsoft Graph `/me` for user
 * profile, which avoids the cost (and depedency on `jose`) of verifying
 * the id_token JWT locally — Microsoft Graph itself enforces the token
 * was issued for our client.
 *
 * Provisioning policy: JIT-create the User on first successful SSO if
 * the email is unknown for this Org (per user decision). Production
 * deployments may want a domain allowlist — leave a TODO.
 */
@Injectable()
export class EntraSsoService {
  private readonly logger = new Logger(EntraSsoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ssoConfig: SsoConfigService,
    private readonly stateStore: EntraStateStore,
    private readonly auth: AuthService,
  ) {}

  /** Build the Microsoft authorize URL + persist CSRF state. */
  async buildAuthorizeUrl(input: {
    orgSlug: string;
    returnTo?: string;
    userAgent?: string;
  }): Promise<{ authorizeUrl: string }> {
    const cfg = await this.ssoConfig.findByOrgSlug(input.orgSlug);
    if (!cfg) {
      throw new NotFoundException('Tổ chức chưa cấu hình SSO');
    }
    const state = await this.stateStore.issue({
      orgId: cfg.organizationId,
      orgSlug: input.orgSlug,
      returnTo: input.returnTo,
      ua: input.userAgent,
    });

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      response_type: 'code',
      response_mode: 'query',
      redirect_uri: this.redirectUri(),
      scope: 'openid profile email offline_access User.Read',
      state,
      prompt: 'select_account',
    });
    const authorizeUrl = `https://login.microsoftonline.com/${encodeURIComponent(
      cfg.tenantId,
    )}/oauth2/v2.0/authorize?${params.toString()}`;
    return { authorizeUrl };
  }

  /** Complete the callback: exchange code, resolve/create user, issue tokens. */
  async completeCallback(input: {
    code: string;
    state: string;
    userAgent?: string;
  }): Promise<{
    user: { id: string; email: string; role: Role; organizationId: string | null; employeeId: string | null };
    accessToken: string;
    refreshToken: string;
    returnTo: string;
  }> {
    const payload = await this.stateStore.consume(input.state);
    if (!payload) {
      throw new UnauthorizedException('Phiên SSO không hợp lệ hoặc đã hết hạn');
    }
    if (payload.ua && input.userAgent && payload.ua !== input.userAgent) {
      // Soft check — different browsers along the redirect (proxy etc.)
      // are common; only log, don't reject.
      this.logger.warn(
        `SSO state UA mismatch — expected="${payload.ua}" got="${input.userAgent}"`,
      );
    }

    const cfg = await this.ssoConfig.findRawByOrg(payload.orgId);
    if (!cfg || !cfg.isActive) {
      throw new NotFoundException('Tổ chức chưa cấu hình SSO');
    }

    const tokenResp = await this.exchangeCode(cfg, input.code);
    const profile = await this.fetchGraphMe(tokenResp.access_token);

    const user = await this.resolveOrProvisionUser({
      orgId: cfg.organizationId,
      externalUserId: profile.id,
      email: profile.mail || profile.userPrincipalName,
      name: profile.displayName,
    });

    const tokens = await this.auth.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      employeeId: user.employeeId,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        employeeId: user.employeeId,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      returnTo: payload.returnTo || '/home',
    };
  }

  private async exchangeCode(
    cfg: OrgSsoConfig,
    code: string,
  ): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
    const url = `https://login.microsoftonline.com/${encodeURIComponent(
      cfg.tenantId,
    )}/oauth2/v2.0/token`;
    const clientSecret = this.ssoConfig.decryptSecret(cfg);
    const body = new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri(),
      scope: 'openid profile email offline_access User.Read',
    });
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!resp.ok) {
      const text = await resp.text();
      this.logger.error(`Entra token exchange failed: ${resp.status} ${text}`);
      throw new UnauthorizedException('Đăng nhập Microsoft thất bại');
    }
    return (await resp.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  }

  private async fetchGraphMe(accessToken: string): Promise<MicrosoftGraphMe> {
    const resp = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) {
      const text = await resp.text();
      this.logger.error(`Graph /me failed: ${resp.status} ${text}`);
      throw new UnauthorizedException('Không lấy được thông tin tài khoản Microsoft');
    }
    return (await resp.json()) as MicrosoftGraphMe;
  }

  private async resolveOrProvisionUser(input: {
    orgId: string;
    externalUserId: string;
    email: string | null | undefined;
    name: string | null | undefined;
  }) {
    if (!input.email) {
      throw new BadRequestException(
        'Tài khoản Microsoft không có email — không thể đăng ký vào C-HR',
      );
    }
    const normalizedEmail = input.email.toLowerCase();

    // 1. Existing SsoLink → fastest path. Use stable Entra `oid`, not email.
    const existingLink = await this.prisma.ssoLink.findUnique({
      where: {
        provider_externalUserId: {
          provider: SsoProvider.ENTRA,
          externalUserId: input.externalUserId,
        },
      },
      include: { user: true },
    });
    if (existingLink) {
      if (existingLink.user.organizationId !== input.orgId) {
        // Same Entra account linked under a different Org — refuse to
        // log them into this Org. Multi-Org SSO is out of scope.
        throw new UnauthorizedException(
          'Tài khoản Microsoft này đã được liên kết với tổ chức khác',
        );
      }
      return existingLink.user;
    }

    // 2. Match by email within the same Org → link an existing user.
    const userByEmail = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, organizationId: input.orgId },
    });
    if (userByEmail) {
      await this.prisma.ssoLink.create({
        data: {
          userId: userByEmail.id,
          provider: SsoProvider.ENTRA,
          externalUserId: input.externalUserId,
          externalEmail: normalizedEmail,
        },
      });
      return userByEmail;
    }

    // 3. JIT provision — create User + SsoLink. role=user (lowest), no
    //    Employee link yet (HR provisions employee row separately).
    //    TODO: enforce email domain allowlist before JIT in production.
    const placeholderHash = `sso:${Date.now()}:${input.externalUserId}`;
    const created = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: placeholderHash,
        name: input.name ?? null,
        role: Role.user,
        organizationId: input.orgId,
        ssoLinks: {
          create: {
            provider: SsoProvider.ENTRA,
            externalUserId: input.externalUserId,
            externalEmail: normalizedEmail,
          },
        },
      },
    });
    this.logger.log(
      `JIT-provisioned User ${created.id} via Entra SSO (org=${input.orgId}, email=${normalizedEmail})`,
    );
    return created;
  }

  private redirectUri(): string {
    const apiUrl =
      this.configService.get<string>('app.publicApiUrl') || 'http://localhost:8000';
    const prefix = this.configService.get<string>('app.apiPrefix') || 'api/v1';
    return `${apiUrl.replace(/\/$/, '')}/${prefix.replace(/^\/|\/$/g, '')}/sso/entra/callback`;
  }
}
