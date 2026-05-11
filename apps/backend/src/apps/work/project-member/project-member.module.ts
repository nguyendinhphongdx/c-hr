import { Module } from '@nestjs/common';

import { ProjectModule } from '../project/project.module';

import { ProjectMemberController } from './project-member.controller';
import { ProjectMemberRepository } from './project-member.repository';
import { ProjectMemberService } from './project-member.service';

@Module({
  imports: [ProjectModule],
  controllers: [ProjectMemberController],
  providers: [ProjectMemberService, ProjectMemberRepository],
  exports: [ProjectMemberService, ProjectMemberRepository],
})
export class ProjectMemberModule {}
