import {
  Body,
  Controller,
  Delete,
  Get,
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

import { CandidateService } from './candidate.service';
import { CreateCandidateDto, ListCandidatesDto, UpdateCandidateDto } from './dto';

@ApiTags('candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('candidates')
export class CandidateController {
  constructor(private readonly service: CandidateService) {}

  @Get()
  list(@Query() query: ListCandidatesDto) {
    return this.service.list(query);
  }

  @Post()
  @Auditable({ action: 'CANDIDATE_CREATE', entity: 'Candidate' })
  create(@Body() dto: CreateCandidateDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Auditable({ action: 'CANDIDATE_UPDATE', entity: 'Candidate' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCandidateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Auditable({ action: 'CANDIDATE_DELETE', entity: 'Candidate' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(id);
  }
}
