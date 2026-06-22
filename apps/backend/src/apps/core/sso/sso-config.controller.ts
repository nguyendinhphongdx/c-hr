import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';
import { RequestContextService } from '@/common/context';
import { Auditable } from '@/common/audit';

import { SsoConfigService } from './sso-config.service';
import { UpsertSsoConfigDto } from './dto/upsert-sso-config.dto';

@ApiTags('sso-config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sso/configs')
export class SsoConfigController {
  constructor(
    private readonly service: SsoConfigService,
    private readonly ctx: RequestContextService,
  ) {}

  @Get('me')
  async getMine() {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAdmin(orgId);
    return this.service.findByOrg(orgId);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'SSO_CONFIG_UPSERT', entity: 'OrgSsoConfig' })
  async upsertMine(@Body() dto: UpsertSsoConfigDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAdmin(orgId);
    return this.service.upsertForOrg(orgId, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auditable({ action: 'SSO_CONFIG_DELETE', entity: 'OrgSsoConfig' })
  async deleteMine() {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAdmin(orgId);
    await this.service.deleteForOrg(orgId);
  }
}
