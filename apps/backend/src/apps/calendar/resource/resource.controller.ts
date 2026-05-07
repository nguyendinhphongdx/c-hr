import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { CreateResourceDto, ListResourcesDto, UpdateResourceDto } from './dto';
import { ResourceService } from './resource.service';

@ApiTags('resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resources')
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  @Get()
  list(@Query() query: ListResourcesDto) {
    return this.service.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Auditable({ action: 'RESOURCE_CREATE', entity: 'Resource' })
  create(@Body() dto: CreateResourceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auditable({ action: 'RESOURCE_UPDATE', entity: 'Resource' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'RESOURCE_DELETE', entity: 'Resource' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
