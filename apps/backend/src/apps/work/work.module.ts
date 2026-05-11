import { Module } from '@nestjs/common';

import { ProjectMemberModule } from './project-member/project-member.module';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';
import { TaskSectionModule } from './task-section/task-section.module';

/**
 * Work bounded context — projects + members + task sections + tasks.
 *
 * Phase 1B — foundation (Project + ProjectMember + TaskSection).
 * Phase 2 — Task entity + watchers.
 */
@Module({
  imports: [ProjectModule, ProjectMemberModule, TaskSectionModule, TaskModule],
  exports: [ProjectModule, ProjectMemberModule, TaskSectionModule, TaskModule],
})
export class WorkModule {}
