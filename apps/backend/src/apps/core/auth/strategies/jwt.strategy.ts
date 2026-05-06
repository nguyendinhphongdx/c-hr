import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '@libs/database/prisma.service';
import { RequestContextService } from '@/common/context';
import { IJwtPayload, RequestUser } from '@/common/types';

/**
 * Extract JWT from httpOnly cookie first, fall back to `Authorization: Bearer <token>`.
 * Frontends using cookies don't need to handle the token at all;
 * non-browser clients (mobile, server-to-server) can keep using the header.
 */
function cookieOrBearerExtractor(cookieName: string) {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken();
  return (req: Request): string | null => {
    const cookieToken = req?.cookies?.[cookieName];
    if (cookieToken) return cookieToken;
    return fromHeader(req);
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
  ) {
    const cookieName = configService.get<string>('auth.cookie.accessName', 'access_token');
    super({
      jwtFromRequest: cookieOrBearerExtractor(cookieName),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtAccessSecret'),
    });
  }

  async validate(payload: IJwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        employeeId: true,
      },
    });
    if (!user) throw new UnauthorizedException('User no longer exists');

    // Pre-load the user's app-admin grants once at auth time so
    // downstream ACL checks stay sync. Org admins/sysowners inherit, so
    // we only need the explicit AppAdmin rows for non-admin users.
    const appAdminCodes =
      user.role === 'user' && user.organizationId
        ? (
            await this.prisma.appAdmin.findMany({
              where: { userId: user.id, organizationId: user.organizationId },
              select: { appCode: true },
            })
          ).map((r) => r.appCode)
        : [];

    // Populate the per-request ALS context so services can read auth
    // data via RequestContextService (ADR 0007). Passport also stores
    // the returned object on `request.user` for @CurrentUser() callers
    // that opt into the typed shape.
    this.ctx.set({
      userId: user.id,
      sessionId: payload.sessionId,
      role: user.role,
      organizationId: user.organizationId,
      employeeId: user.employeeId,
      appAdminCodes,
    });

    return {
      id: user.id,
      email: user.email,
      sessionId: payload.sessionId,
      role: user.role,
      organizationId: user.organizationId,
      employeeId: user.employeeId,
    };
  }
}
