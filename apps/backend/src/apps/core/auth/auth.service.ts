import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@libs/database/prisma.service';
import { LdapService, type LdapProfile } from '@libs/ldap';
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
          title: profile.title,
          phone: profile.phone,
          password: await bcrypt.hash(uuidv4(), SALT_ROUNDS),
          role: 'user',
          organizationId: organization.id,
        },
      });
    }

    user = await this.ensureLdapEmployee(user, profile);

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

  private async ensureLdapEmployee(user: User, profile: LdapProfile): Promise<User> {
    if (!user.organizationId || user.role === 'sysowner') {
      throw new UnauthorizedException(
        'Tài khoản AD chưa thuộc tổ chức nên không thể tạo hồ sơ nhân viên',
      );
    }
    const employeeCode = profile.employeeId
      ? 'AD-' + profile.employeeId
      : profile.username.split('@')[0];

    // Fields được sync từ LDAP mỗi lần login. undefined = Prisma bỏ qua field đó.
    const syncData = {
      attendanceCode: profile.attendanceCode ?? undefined,
      title: profile.title ?? undefined,
      code: employeeCode,
    };

    // Đã link employee — update thẳng bằng ID, tránh đụng unique constraint
    if (user.employeeId) {
      await this.syncEmployee(user.employeeId, syncData);
      return user;
    }

    // Chưa có employee — upsert theo code rồi link
    const employee = await this.prisma.employee.upsert({
      where: {
        organizationId_code: { organizationId: user.organizationId, code: employeeCode },
      },
      update: syncData,
      create: { organizationId: user.organizationId, ...syncData },
    });

    return this.prisma.user.update({
      where: { id: user.id },
      data: { employeeId: employee.id },
    });
  }

  private async syncEmployee(id: string, data: Prisma.EmployeeUpdateInput): Promise<void> {
    try {
      await this.prisma.employee.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // attendanceCode đã thuộc employee khác — bỏ qua field đó, sync phần còn lại
        const { attendanceCode, ...rest } = data;
        void attendanceCode;
        if (Object.keys(rest).length) {
          await this.prisma.employee.update({ where: { id }, data: rest });
        }
      } else {
        throw e;
      }
    }
  }
}
