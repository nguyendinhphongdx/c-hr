import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { setAuthCookies } from '../../auth/auth.cookies';
import { InvitationService } from '../../invitation/invitation.service';
import { EntraOrphanStore } from './entra-orphan.store';
import { EntraSsoService } from './entra-sso.service';
import { PrismaService } from '@libs/database/prisma.service';

const ORPHAN_COOKIE = 'sso_orphan';
const ORPHAN_COOKIE_MAX_AGE = 30 * 60 * 1000;

class SubmitJoinRequestDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}

@ApiTags('sso-entra')
@Controller('sso/entra')
export class EntraSsoController {
  constructor(
    private readonly service: EntraSsoService,
    private readonly orphanStore: EntraOrphanStore,
    private readonly invitations: InvitationService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /** FE calls before redirecting to Microsoft. Returns the URL rather
   *  than a 302 so the FE can decide how to navigate (popup vs full
   *  redirect). Public — user is anonymous at this point. */
  @Get('start')
  async start(@Query('returnTo') returnTo: string | undefined, @Req() req: Request) {
    return this.service.buildAuthorizeUrl({
      returnTo,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  /** Microsoft redirects browser here after consent. Either:
   *   - sets auth cookies + 302 to FE /home (or returnTo)
   *   - sets orphan cookie + 302 to FE /no-org */
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const feUrl = (
      this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000'
    ).replace(/\/$/, '');

    if (error) {
      const msg = encodeURIComponent(errorDescription || error);
      return res.redirect(`${feUrl}/login?ssoError=${msg}`);
    }
    if (!code || !state) {
      throw new UnauthorizedException('Thiếu code/state — phiên SSO không hợp lệ');
    }

    const result = await this.service.completeCallback({
      code,
      state,
      userAgent: req.headers['user-agent'] as string | undefined,
    });

    if (result.kind === 'orphan') {
      this.setOrphanCookie(res, result.orphanToken);
      return res.redirect(`${feUrl}/no-org`);
    }

    setAuthCookies(
      res,
      { accessToken: result.accessToken, refreshToken: result.refreshToken },
      this.configService,
    );
    const safeReturn = result.returnTo.startsWith('/') ? result.returnTo : '/home';
    return res.redirect(`${feUrl}${safeReturn}`);
  }

  // ── Orphan session endpoints (cookie-keyed) ──────────────────────

  /** FE /no-org page calls this on mount to render the welcome card. */
  @Get('orphan/me')
  async orphanMe(@Req() req: Request) {
    const profile = await this.readOrphanProfile(req);
    return {
      email: profile.email,
      name: profile.name,
    };
  }

  /** Org suggestions — find Orgs that already have users with the
   *  same email domain (vd @cmc.vn match). Limit 5 by member count. */
  @Get('orphan/suggested-orgs')
  async suggestedOrgs(@Req() req: Request) {
    const profile = await this.readOrphanProfile(req);
    const domain = profile.email.split('@')[1]?.toLowerCase();
    if (!domain) return [];
    const orgs = await this.prisma.organization.findMany({
      where: {
        deletedAt: null,
        users: { some: { email: { endsWith: `@${domain}` } } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      memberCount: o._count.users,
    }));
  }

  /** Free-text search — at least 2 chars to prevent enumeration via
   *  blank query. Returns prefix matches on name or slug. */
  @Get('orphan/search-orgs')
  async searchOrgs(@Req() req: Request, @Query('q') q: string | undefined) {
    await this.readOrphanProfile(req);
    const query = (q ?? '').trim();
    if (query.length < 2) return [];
    const orgs = await this.prisma.organization.findMany({
      where: {
        deletedAt: null,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { slug: { contains: query.toLowerCase() } },
        ],
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
      take: 10,
    });
    return orgs;
  }

  /** Submit a SELF_REQUEST against the chosen Org. Identity comes from
   *  the orphan cookie — invitee cannot spoof email. */
  @Post('orphan/join-request')
  @HttpCode(HttpStatus.CREATED)
  async submitJoinRequest(@Req() req: Request, @Body() dto: SubmitJoinRequestDto) {
    const profile = await this.readOrphanProfile(req);
    const org = await this.prisma.organization.findFirst({
      where: { id: dto.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!org) {
      throw new NotFoundException('Tổ chức không tồn tại');
    }
    return this.invitations.createSelfRequest({
      orgId: dto.organizationId,
      email: profile.email,
      name: profile.name,
      externalUserId: profile.externalUserId,
      message: dto.message,
    });
  }

  /** Explicit logout from orphan flow (user dismisses /no-org). */
  @Delete('orphan')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearOrphan(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[ORPHAN_COOKIE];
    if (token) await this.orphanStore.revoke(token);
    res.clearCookie(ORPHAN_COOKIE, this.orphanCookieOptions());
  }

  // ── helpers ──────────────────────────────────────────────────────

  private async readOrphanProfile(req: Request) {
    const token = req.cookies?.[ORPHAN_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Không tìm thấy phiên SSO — đăng nhập lại');
    }
    const profile = await this.orphanStore.peek(token);
    if (!profile) {
      throw new UnauthorizedException('Phiên SSO đã hết hạn — đăng nhập lại');
    }
    if (!profile.email) {
      throw new BadRequestException('Phiên SSO không có email');
    }
    return profile;
  }

  private setOrphanCookie(res: Response, token: string) {
    res.cookie(ORPHAN_COOKIE, token, {
      ...this.orphanCookieOptions(),
      maxAge: ORPHAN_COOKIE_MAX_AGE,
    });
  }

  private orphanCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.configService.get<boolean>('auth.cookie.secure', false),
      sameSite: this.configService.get<'lax' | 'strict' | 'none'>('auth.cookie.sameSite', 'lax'),
      domain: this.configService.get<string>('auth.cookie.domain'),
      path: '/',
    };
  }
}
