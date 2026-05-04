import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';

import { RequestGroupService } from './request-group.service';

@ApiTags('request-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('request-groups')
export class RequestGroupController {
  constructor(private readonly service: RequestGroupService) {}

  /// MVP: read-only list. Form-builder UI (F5.2) will add POST/PATCH later.
  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
