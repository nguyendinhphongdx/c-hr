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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { Auditable } from '@/common/audit';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';

import { AddMemberDto, UpdateMemberRoleDto } from './dto';
import { ProjectMemberService } from './project-member.service';

@ApiTags('project-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects/:id/members')
export class ProjectMemberController {
  constructor(private readonly service: ProjectMemberService) {}

  @Get()
  list(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.service.list(projectId);
  }

  @Post()
  @Auditable({ action: 'PROJECT_MEMBER_ADD', entity: 'ProjectMember' })
  add(@Param('id', ParseUUIDPipe) projectId: string, @Body() dto: AddMemberDto) {
    return this.service.add(projectId, dto);
  }

  @Patch(':userId')
  @Auditable({ action: 'PROJECT_MEMBER_UPDATE_ROLE', entity: 'ProjectMember' })
  updateRole(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.service.updateRole(projectId, userId, dto);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  @Auditable({ action: 'PROJECT_MEMBER_REMOVE', entity: 'ProjectMember' })
  remove(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.service.remove(projectId, userId);
  }
}
