import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { SsoProvider } from '@prisma/client';

export class UpsertSsoConfigDto {
  @IsEnum(SsoProvider)
  @IsOptional()
  provider?: SsoProvider;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  tenantId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  clientId!: string;

  /**
   * Optional on update — when omitted, BE keeps the existing encrypted
   * secret. Required on first create (service-level check).
   */
  @IsString()
  @IsOptional()
  @MaxLength(512)
  clientSecret?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
