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

import { CreateJobDto, ListJobsDto, UpdateJobDto } from './dto';
import { JobService } from './job.service';

@ApiTags('jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobController {
  constructor(private readonly service: JobService) {}

  @Get()
  list(@Query() query: ListJobsDto) {
    return this.service.list(query);
  }

  @Post()
  @Auditable({ action: 'JOB_CREATE', entity: 'Job' })
  create(@Body() dto: CreateJobDto) {
    return this.service.create(dto);
  }

  @Get(':idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.service.findOne(idOrSlug);
  }

  @Patch(':id')
  @Auditable({ action: 'JOB_UPDATE', entity: 'Job' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateJobDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'JOB_PUBLISH', entity: 'Job' })
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.publish(id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'JOB_PAUSE', entity: 'Job' })
  pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.pause(id);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'JOB_CLOSE', entity: 'Job' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.close(id);
  }

  @Delete(':id')
  @Auditable({ action: 'JOB_DELETE', entity: 'Job' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}
