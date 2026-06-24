import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { LdapLoginDto, LoginDto, RegisterDto, RefreshTokenDto } from './dto';
import { setAuthCookies, clearAuthCookies, getAuthCookieConfig } from './auth.cookies';
import { JwtAuthGuard } from '@/common/guards';
import { CurrentUser } from '@/common/decorators';
import { RequestUser } from '@/common/types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    setAuthCookies(res, result, this.configService);
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    setAuthCookies(res, result, this.configService);
    return result;
  }

  @HttpCode(HttpStatus.OK)
  @Post('ldap/login')
  async ldapLogin(@Body() dto: LdapLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithLdap(dto);
    setAuthCookies(res, result, this.configService);
    return result;
  }

  /**
   * Refresh tokens. Reads `refreshToken` from request body or from the refresh cookie.
   */
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieCfg = getAuthCookieConfig(this.configService);
    const refreshToken = dto?.refreshToken || req.cookies?.[cookieCfg.refreshName];
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');

    const tokens = await this.authService.refresh(refreshToken);
    setAuthCookies(res, tokens, this.configService);
    return tokens;
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res, this.configService);
    return { success: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return user;
  }
}
