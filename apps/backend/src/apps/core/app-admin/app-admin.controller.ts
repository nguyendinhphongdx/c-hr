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
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { AppAdminService } from './app-admin.service';
import { GrantAppAdminDto, ListAppAdminsDto } from './dto';

@ApiTags('app-admins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('app-admins')
export class AppAdminController {
  constructor(private readonly service: AppAdminService) {}

  @Get()
  list(@Query() query: ListAppAdminsDto) {
    return this.service.list(query.app);
  }

  @Post()
  @Auditable({ action: 'APP_ADMIN_GRANT', entity: 'AppAdmin' })
  grant(@Body() dto: GrantAppAdminDto) {
    return this.service.grant(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'APP_ADMIN_REVOKE', entity: 'AppAdmin' })
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.revoke(id);
  }
}
