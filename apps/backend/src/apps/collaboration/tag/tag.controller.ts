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

import { CreateTagDto, ListTagsDto, UpdateTagDto } from './dto';
import { TagService } from './tag.service';

@ApiTags('tags')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tags')
export class TagController {
  constructor(private readonly service: TagService) {}

  @Get()
  list(@Query() query: ListTagsDto) {
    return this.service.list(query);
  }

  @Post()
  @Auditable({ action: 'TAG_CREATE', entity: 'Tag' })
  create(@Body() dto: CreateTagDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Auditable({ action: 'TAG_UPDATE', entity: 'Tag' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTagDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'TAG_DELETE', entity: 'Tag' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}
