import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, SsoProvider } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

import { AuthService } from '../../auth/auth.service';
import { InvitationService } from '../../invitation/invitation.service';
import { EntraOrphanStore } from './entra-orphan.store';
import { EntraStateStore } from './entra-state.store';

interface MicrosoftGraphMe {
  id: string; // Entra `oid` claim
  mail: string | null;
  userPrincipalName: string;
  displayName: string | null;
}

interface MicrosoftConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export type CallbackResult =
  | {
      kind: 'authenticated';
      user: {
        id: string;
        email: string;
        role: Role;
        organizationId: string | null;
        employeeId: string | null;
      };
      accessToken: string;
      refreshToken: string;
      returnTo: string;
    }
  | {
      kind: 'orphan';
      orphanToken: string;
      email: string;
      returnTo: string;
    };

type ResolveResult = { kind: 'user'; user: ResolvedUser } | { kind: 'orphan'; email: string };

interface ResolvedUser {
  id: string;
  email: string;
  role: Role;
  organizationId: string | null;
  employeeId: string | null;
}

/**
 * Authorization-code OAuth flow against Microsoft Entra ID, shared
 * multi-tenant pattern: one Entra app registered in the SaaS Azure
 * tenant serves every C-HR Org. The user clicks "Login with Microsoft",
 * Entra picks the account, we get the email back, and we resolve the
 * Org by matching that email to an existing User row.
 *
 * No JIT here — admin must invite (create the User row) first. JIT
 * doesn't fit a shared multi-tenant app because we'd need a separate
 * signal (email domain → Org) to know which Org to provision into.
 */
@Injectable()
export class EntraSsoService {
  private readonly logger = new Logger(EntraSsoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly stateStore: EntraStateStore,
    private readonly orphanStore: EntraOrphanStore,
    private readonly auth: AuthService,
    private readonly invitations: InvitationService,
  ) {}

  /** Build the Microsoft authorize URL + persist CSRF state. */
  async buildAuthorizeUrl(input: {
    returnTo?: string;
    userAgent?: string;
  }): Promise<{ authorizeUrl: string }> {
    const cfg = this.requireConfig();
    const state = await this.stateStore.issue({
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

  /** Complete the callback: exchange code, then either log the user in
   *  or hand the controller an orphan-session token to set as a cookie
   *  so /no-org can drive the SELF_REQUEST flow. */
  async completeCallback(input: {
    code: string;
    state: string;
    userAgent?: string;
  }): Promise<CallbackResult> {
    const cfg = this.requireConfig();
    const payload = await this.stateStore.consume(input.state);
    if (!payload) {
      throw new UnauthorizedException('Phiên SSO không hợp lệ hoặc đã hết hạn');
    }
    if (payload.ua && input.userAgent && payload.ua !== input.userAgent) {
      this.logger.warn(`SSO state UA mismatch — expected="${payload.ua}" got="${input.userAgent}"`);
    }

    const tokenResp = await this.exchangeCode(cfg, input.code);
    const profile = await this.fetchGraphMe(tokenResp.access_token);
    const email = (profile.mail || profile.userPrincipalName || '').toLowerCase();
    const name = profile.displayName ?? null;

    const resolved = await this.resolveOrCreateUserViaInvite({
      externalUserId: profile.id,
      email,
      name,
    });

    if (resolved.kind === 'orphan') {
      const orphanToken = await this.orphanStore.issue({
        email: resolved.email,
        name,
        externalUserId: profile.id,
      });
      return {
        kind: 'orphan',
        orphanToken,
        email: resolved.email,
        returnTo: payload.returnTo || '/home',
      };
    }

    const user = resolved.user;
    const tokens = await this.auth.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      employeeId: user.employeeId,
    });

    return {
      kind: 'authenticated',
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

  private requireConfig(): MicrosoftConfig {
    const tenantId = this.configService.get<string>('sso.microsoft.tenantId') || 'common';
    const clientId = this.configService.get<string>('sso.microsoft.clientId');
    const clientSecret = this.configService.get<string>('sso.microsoft.clientSecret');
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'SSO Microsoft chưa được cấu hình — liên hệ admin hệ thống',
      );
    }
    return { tenantId, clientId, clientSecret };
  }

  private async exchangeCode(
    cfg: MicrosoftConfig,
    code: string,
  ): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
    const url = `https://login.microsoftonline.com/${encodeURIComponent(
      cfg.tenantId,
    )}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
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
    return (await resp.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
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

  private async resolveOrCreateUserViaInvite(input: {
    externalUserId: string;
    email: string | null | undefined;
    name: string | null;
  }): Promise<ResolveResult> {
    if (!input.email) {
      throw new BadRequestException(
        'Tài khoản Microsoft không có email — không thể đăng nhập vào C-HR',
      );
    }
    const normalizedEmail = input.email.toLowerCase();

    // 1. Existing SsoLink → fastest path. Stable across email changes.
    const existingLink = await this.prisma.ssoLink.findUnique({
      where: {
        provider_externalUserId: {
          provider: SsoProvider.ENTRA,
          externalUserId: input.externalUserId,
        },
      },
      include: { user: true },
    });
    if (existingLink) return { kind: 'user', user: existingLink.user };

    // 2. Match by email → first-time link.
    const userByEmail = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
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
      this.logger.log(
        `Linked existing User ${userByEmail.id} to Entra account on first SSO (email=${normalizedEmail})`,
      );
      return { kind: 'user', user: userByEmail };
    }

    // 3. No User yet — check pending ADMIN_INVITE matching email. If
    //    found, auto-accept (create User + SsoLink + mark COMPLETED)
    //    so the SSO login lands inside the Org without ever needing
    //    the magic link.
    const invited = await this.invitations.tryAcceptViaSso({
      email: normalizedEmail,
      name: input.name,
      externalUserId: input.externalUserId,
    });
    if (invited) return { kind: 'user', user: invited };

    // 4. No User + no invite → orphan. Controller stashes the MS
    //    profile in Redis + sets a cookie, redirects FE to /no-org.
    return { kind: 'orphan', email: normalizedEmail };
  }

  private redirectUri(): string {
    const apiUrl = this.configService.get<string>('app.apiBaseURL') || 'http://localhost:8000';
    const prefix = this.configService.get<string>('app.apiPrefix') || 'api/v1';
    return `${apiUrl.replace(/\/$/, '')}/${prefix.replace(/^\/|\/$/g, '')}/sso/entra/callback`;
  }
}
