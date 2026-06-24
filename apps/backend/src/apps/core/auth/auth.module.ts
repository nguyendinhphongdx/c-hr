import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard, OptionalAuthGuard } from '@/common/guards';
import { LdapModule } from '@libs/ldap';

@Module({
  imports: [PassportModule, JwtModule.register({}), LdapModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, OptionalAuthGuard],
  exports: [AuthService, JwtStrategy, JwtAuthGuard, OptionalAuthGuard],
})
export class AuthModule {}
