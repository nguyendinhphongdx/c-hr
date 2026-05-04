import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { CurrentUser } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards';
import { RequestUser } from '@/common/types';

import { setAuthCookies } from '../auth/auth.cookies';
import { SignupDto, UpdateOrganizationDto } from './dto';
import { OrganizationService } from './organization.service';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly orgService: OrganizationService,
    private readonly configService: ConfigService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.orgService.signup(dto);
    setAuthCookies(res, result, this.configService);
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@CurrentUser() user: RequestUser) {
    return this.orgService.findMine(user.organizationId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMine(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgService.updateMine(user, dto);
  }
}
