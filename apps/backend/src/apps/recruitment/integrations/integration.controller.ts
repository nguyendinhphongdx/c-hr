import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JobBoard } from '@prisma/client';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';

import { UpsertIntegrationDto } from './dto';
import { IntegrationService } from './integration.service';

@ApiTags('recruitment-integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recruitment/integrations')
export class IntegrationController {
  constructor(private readonly service: IntegrationService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Put()
  @Auditable({
    action: 'RECRUITMENT_INTEGRATION_UPSERT',
    entity: 'JobBoardIntegration',
  })
  upsert(@Body() dto: UpsertIntegrationDto) {
    return this.service.upsert(dto);
  }

  @Post(':board/toggle')
  @HttpCode(HttpStatus.OK)
  @Auditable({
    action: 'RECRUITMENT_INTEGRATION_TOGGLE',
    entity: 'JobBoardIntegration',
  })
  toggle(@Param('board') board: JobBoard) {
    return this.service.toggle(board);
  }

  @Delete(':board')
  @Auditable({
    action: 'RECRUITMENT_INTEGRATION_DELETE',
    entity: 'JobBoardIntegration',
  })
  async remove(@Param('board') board: JobBoard) {
    await this.service.remove(board);
    return { success: true as const };
  }
}
