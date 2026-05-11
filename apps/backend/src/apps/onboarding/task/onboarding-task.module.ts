import { Module } from '@nestjs/common';

import { OnboardingPlanModule } from '../plan/onboarding-plan.module';

import { OnboardingTaskController } from './onboarding-task.controller';
import { OnboardingTaskRepository } from './onboarding-task.repository';
import { OnboardingTaskService } from './onboarding-task.service';

/**
 * Imports PlanModule so TaskService can call `planService.checkTransition`
 * after task complete/uncomplete. Plan service never needs the task
 * service back — cascading task deletes go through Prisma.
 */
@Module({
  imports: [OnboardingPlanModule],
  controllers: [OnboardingTaskController],
  providers: [OnboardingTaskService, OnboardingTaskRepository],
  exports: [OnboardingTaskService, OnboardingTaskRepository],
})
export class OnboardingTaskModule {}
