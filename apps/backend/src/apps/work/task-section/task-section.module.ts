import { Module } from '@nestjs/common';

import { ProjectModule } from '../project/project.module';

import { TaskSectionController } from './task-section.controller';
import { TaskSectionRepository } from './task-section.repository';
import { TaskSectionService } from './task-section.service';

@Module({
  imports: [ProjectModule],
  controllers: [TaskSectionController],
  providers: [TaskSectionService, TaskSectionRepository],
  exports: [TaskSectionService, TaskSectionRepository],
})
export class TaskSectionModule {}
