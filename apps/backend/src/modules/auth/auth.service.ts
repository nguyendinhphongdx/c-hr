import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@libs/database/prisma.service';
import { IAuthTokens, IJwtPayload } from '@/common/types';
import { LoginDto, RegisterDto } from './dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: this.sanitize(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens(user.id, user.email);
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

    return this.issueTokens(user.id, user.email);
  }

  private async issueTokens(userId: string, email: string): Promise<IAuthTokens> {
    const sessionId = uuidv4();
    const payload: IJwtPayload = { sub: userId, email, sessionId };

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

  private sanitize<T extends { password?: string }>(user: T) {
    const { password, ...rest } = user as any;
    return rest;
  }
}
