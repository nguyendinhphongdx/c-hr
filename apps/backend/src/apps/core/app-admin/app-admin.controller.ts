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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { CurrentUser } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';
import { RequestUser } from '@/common/types';

import { AppAdminService } from './app-admin.service';
import { GrantAppAdminDto, ListAppAdminsDto } from './dto';

@ApiTags('app-admins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('app-admins')
export class AppAdminController {
  constructor(private readonly service: AppAdminService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: ListAppAdminsDto) {
    return this.service.list(user, query.app);
  }

  @Post()
  @Auditable({ action: 'APP_ADMIN_GRANT', entity: 'AppAdmin' })
  grant(@CurrentUser() user: RequestUser, @Body() dto: GrantAppAdminDto) {
    return this.service.grant(user, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'APP_ADMIN_REVOKE', entity: 'AppAdmin' })
  revoke(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.revoke(user, id);
  }
}
