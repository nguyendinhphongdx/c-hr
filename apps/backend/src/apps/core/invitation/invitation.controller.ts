import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { JwtAuthGuard } from '@/common/guards';
import { Auditable } from '@/common/audit';

import { setAuthCookies } from '../auth/auth.cookies';

import { InvitationService } from './invitation.service';
import {
  AcceptByTokenDto,
  CreateAdminInviteDto,
  DecideInvitationDto,
  ListInvitationsDto,
} from './dto';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationController {
  constructor(
    private readonly service: InvitationService,
    private readonly configService: ConfigService,
  ) {}

  // ── Admin-only endpoints (JWT guard) ─────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Query() query: ListInvitationsDto) {
    return this.service.listByOrgForAdmin(query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  @Auditable({ action: 'INVITATION_CREATE', entity: 'Invitation' })
  async create(@Body() dto: CreateAdminInviteDto) {
    const row = await this.service.createAdminInvite({
      email: dto.email,
      name: dto.name,
      message: dto.message,
      role: dto.role,
    });
    return {
      ...row,
      /** Pre-built URL the admin can copy / share. Frontend reads
       *  invite_token from the row and reconstructs this too, but
       *  including it here is convenient. */
      acceptUrl: this.buildAcceptUrl(row.inviteToken!),
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'INVITATION_REVOKE', entity: 'Invitation' })
  async revoke(@Param('id') id: string, @Body() dto: DecideInvitationDto) {
    return this.service.revoke(id, dto.decisionNote);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'INVITATION_APPROVE', entity: 'Invitation' })
  async approve(@Param('id') id: string, @Body() dto: DecideInvitationDto) {
    return this.service.approveSelfRequest(id, dto.decisionNote);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'INVITATION_REJECT', entity: 'Invitation' })
  async reject(@Param('id') id: string, @Body() dto: DecideInvitationDto) {
    return this.service.rejectSelfRequest(id, dto.decisionNote);
  }

  // ── Public endpoints (token-based for ADMIN_INVITE accept) ───────

  @Get('by-token/:token')
  async getByToken(@Param('token') token: string) {
    const row = await this.service.getByToken(token);
    if (!row) {
      return { invitation: null as never, reason: 'invalid_or_expired' as const };
    }
    return { invitation: row };
  }

  @Post('by-token/:token/accept')
  @HttpCode(HttpStatus.OK)
  async acceptByToken(
    @Param('token') token: string,
    @Body() dto: AcceptByTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.acceptByToken({
      token,
      password: dto.password,
      name: dto.name,
    });
    setAuthCookies(
      res,
      { accessToken: result.accessToken, refreshToken: result.refreshToken },
      this.configService,
    );
    return result;
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private buildAcceptUrl(token: string): string {
    const feUrl = (
      this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000'
    ).replace(/\/$/, '');
    return `${feUrl}/invite/${encodeURIComponent(token)}`;
  }
}
