import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/common/guards';

import { AttachTagDto, BulkSetTagsDto, ListAssignmentsDto } from './dto';
import { TagService } from './tag.service';

@ApiTags('tag-assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tag-assignments')
export class TagAssignmentController {
  constructor(private readonly service: TagService) {}

  @Get()
  list(@Query() query: ListAssignmentsDto) {
    return this.service.listForObject(query.objectType, query.objectId);
  }

  @Post()
  attach(@Body() dto: AttachTagDto) {
    return this.service.attach(dto);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  detach(@Query() dto: AttachTagDto) {
    return this.service.detach(dto);
  }

  @Put('bulk')
  bulkSet(@Body() dto: BulkSetTagsDto) {
    return this.service.bulkSetForObject(dto);
  }
}
