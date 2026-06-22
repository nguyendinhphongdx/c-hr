import { Controller, Get, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { setAuthCookies } from '../../auth/auth.cookies';
import { StartSsoDto } from '../dto/start-sso.dto';
import { EntraSsoService } from './entra-sso.service';

@ApiTags('sso-entra')
@Controller('sso/entra')
export class EntraSsoController {
  constructor(
    private readonly service: EntraSsoService,
    private readonly configService: ConfigService,
  ) {}

  /** FE calls before redirecting to Microsoft. Returns the URL rather
   *  than a 302 so the FE can decide how to navigate (popup vs full
   *  redirect). No JwtAuthGuard — user is anonymous at this point. */
  @Get('start')
  async start(@Query() query: StartSsoDto, @Req() req: Request) {
    return this.service.buildAuthorizeUrl({
      orgSlug: query.orgSlug,
      returnTo: query.returnTo,
      userAgent: req.headers['user-agent'] as string | undefined,
    });
  }

  /** Microsoft redirects browser here after consent. Sets cookies via
   *  the shared auth helper and 302s to the FE. */
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

    setAuthCookies(
      res,
      { accessToken: result.accessToken, refreshToken: result.refreshToken },
      this.configService,
    );
    const safeReturn = result.returnTo.startsWith('/') ? result.returnTo : '/home';
    return res.redirect(`${feUrl}${safeReturn}`);
  }
}
