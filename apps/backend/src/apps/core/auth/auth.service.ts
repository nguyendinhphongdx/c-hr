import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@libs/database/prisma.service';
import { LdapService } from '@libs/ldap';
import { IAuthTokens, IJwtPayload } from '@/common/types';
import { LdapLoginDto, LoginDto, RegisterDto } from './dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly ldapService: LdapService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        name: dto.name,
      },
    });

    const tokens = await this.issueTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  async loginWithLdap(dto: LdapLoginDto) {
    const profile = await this.ldapService.authenticate(dto.username, dto.password);
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });
    if (!user) {
      const organizationId = this.configService.get<string>('ldap.defaultOrganizationId');
      if (!organizationId) {
        throw new UnauthorizedException('Tài khoản AD chưa được cấp quyền sử dụng C-HR');
      }

      const organization = await this.prisma.organization.findFirst({
        where: { id: organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!organization) {
        throw new ServiceUnavailableException(
          'LDAP_DEFAULT_ORGANIZATION_ID không trỏ tới tổ chức hợp lệ',
        );
      }

      user = await this.prisma.user.upsert({
        where: { email: profile.email },
        update: {},
        create: {
          email: profile.email,
          name: profile.name,
          password: await bcrypt.hash(uuidv4(), SALT_ROUNDS),
          role: 'user',
          organizationId: organization.id,
        },
      });
    }

    const tokens = await this.issueTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  async refresh(refreshToken: string): Promise<IAuthTokens> {
    let payload: IJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<IJwtPayload>(refreshToken, {
        secret: this.configService.get<string>('auth.jwtRefreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User no longer exists');

    return this.issueTokens(user);
  }

  /**
   * Issue access + refresh tokens. Public so signup flows
   * (OrganizationService.signup) can mint tokens after creating the User
   * in the same transaction.
   */
  async issueTokens(user: {
    id: string;
    email: string;
    role: IJwtPayload['role'];
    organizationId: string | null;
    employeeId: string | null;
  }): Promise<IAuthTokens> {
    const sessionId = uuidv4();
    const payload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
      role: user.role,
      organizationId: user.organizationId,
      employeeId: user.employeeId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.jwtAccessSecret'),
      expiresIn: this.configService.get<string>('auth.jwtAccessExpiration', '15m') as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('auth.jwtRefreshSecret'),
      expiresIn: this.configService.get<string>('auth.jwtRefreshExpiration', '7d') as any,
    });

    return { accessToken, refreshToken };
  }

  private sanitize<T extends { password?: string }>(user: T): Omit<T, 'password'> {
    const result = { ...user };
    delete result.password;
    return result;
  }
}
