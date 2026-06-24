import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { PushJobDto } from './dto';
import { PostingService } from './posting.service';

@ApiTags('recruitment-postings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs/:jobId/postings')
export class PostingController {
  constructor(private readonly service: PostingService) {}

  @Get()
  list(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.service.listForJob(jobId);
  }

  @Post('push')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'JOB_BOARD_PUSH', entity: 'JobBoardPosting' })
  push(@Param('jobId', ParseUUIDPipe) jobId: string, @Body() dto: PushJobDto) {
    return this.service.pushJob(jobId, dto.board);
  }

  @Post('close')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'JOB_BOARD_CLOSE', entity: 'JobBoardPosting' })
  close(@Param('jobId', ParseUUIDPipe) jobId: string, @Body() dto: PushJobDto) {
    return this.service.closePosting(jobId, dto.board);
  }
}
