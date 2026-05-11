import { Module } from '@nestjs/common';

import { ProjectModule } from '../project/project.module';
import { TaskModule } from '../task/task.module';

import { TaskTimerController } from './task-timer.controller';
import { TaskTimerRepository } from './task-timer.repository';
import { TaskTimerService } from './task-timer.service';

@Module({
  imports: [ProjectModule, TaskModule],
  controllers: [TaskTimerController],
  providers: [TaskTimerService, TaskTimerRepository],
  exports: [TaskTimerService, TaskTimerRepository],
})
export class TaskTimerModule {}
