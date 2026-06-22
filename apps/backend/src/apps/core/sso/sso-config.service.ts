import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrgSsoConfig, SsoProvider } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';
import { CryptoService } from '@libs/crypto';

import { UpsertSsoConfigDto } from './dto/upsert-sso-config.dto';

export interface SsoConfigDto {
  id: string;
  organizationId: string;
  provider: SsoProvider;
  tenantId: string;
  clientId: string;
  /** True when a secret is stored; the value itself is never exposed. */
  hasClientSecret: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SsoConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async findByOrg(organizationId: string): Promise<SsoConfigDto | null> {
    const row = await this.prisma.orgSsoConfig.findUnique({ where: { organizationId } });
    return row ? this.toDto(row) : null;
  }

  /** Look up config by Org slug — used by the public /sso/entra/start endpoint. */
  async findByOrgSlug(slug: string): Promise<OrgSsoConfig | null> {
    return this.prisma.orgSsoConfig.findFirst({
      where: { organization: { slug }, isActive: true },
    });
  }

  /**
   * Internal use only — returns the raw row including the encrypted secret
   * so the Entra service can decrypt it during the callback exchange.
   * Never returned over HTTP.
   */
  async findRawByOrg(organizationId: string): Promise<OrgSsoConfig | null> {
    return this.prisma.orgSsoConfig.findUnique({ where: { organizationId } });
  }

  decryptSecret(row: OrgSsoConfig): string {
    return this.crypto.decrypt(row.clientSecretEnc);
  }

  async upsertForOrg(
    organizationId: string,
    dto: UpsertSsoConfigDto,
  ): Promise<SsoConfigDto> {
    const existing = await this.prisma.orgSsoConfig.findUnique({
      where: { organizationId },
    });
    if (!existing && !dto.clientSecret) {
      throw new BadRequestException(
        'clientSecret is required when creating the SSO config for the first time',
      );
    }
    const clientSecretEnc = dto.clientSecret
      ? this.crypto.encrypt(dto.clientSecret)
      : existing!.clientSecretEnc;
    const provider = dto.provider ?? existing?.provider ?? SsoProvider.ENTRA;
    const isActive = dto.isActive ?? existing?.isActive ?? true;
    const row = await this.prisma.orgSsoConfig.upsert({
      where: { organizationId },
      create: {
        organizationId,
        provider,
        tenantId: dto.tenantId,
        clientId: dto.clientId,
        clientSecretEnc,
        isActive,
      },
      update: {
        provider,
        tenantId: dto.tenantId,
        clientId: dto.clientId,
        clientSecretEnc,
        isActive,
      },
    });
    return this.toDto(row);
  }

  async deleteForOrg(organizationId: string): Promise<void> {
    const existing = await this.prisma.orgSsoConfig.findUnique({
      where: { organizationId },
    });
    if (!existing) throw new NotFoundException('SSO config not found');
    await this.prisma.orgSsoConfig.delete({ where: { organizationId } });
  }

  private toDto(row: OrgSsoConfig): SsoConfigDto {
    return {
      id: row.id,
      organizationId: row.organizationId,
      provider: row.provider,
      tenantId: row.tenantId,
      clientId: row.clientId,
      hasClientSecret: !!row.clientSecretEnc,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
