import { Module } from '@nestjs/common';

import { EmployeeLifecycleListener } from './lifecycle/employee-lifecycle.listener';
import { OnboardingPlanModule } from './plan/onboarding-plan.module';
import { OnboardingTaskModule } from './task/onboarding-task.module';
import { OnboardingTemplateModule } from './template/onboarding-template.module';

/**
 * Onboarding bounded context — F10.
 *
 * Phase 1: OnboardingTemplate CRUD + nested template-task management.
 * Phase 2 (current): OnboardingPlan + OnboardingTask services + Employee
 *   lifecycle listener (auto-apply default template on hire, auto-archive
 *   plan on terminate). Lifecycle listener lives in this module because it
 *   spans plan + employee concerns and uses PlanService.
 * Phase 3+: MyOnboardingView FE, comments integration, notifications.
 */
@Module({
  imports: [OnboardingTemplateModule, OnboardingPlanModule, OnboardingTaskModule],
  providers: [EmployeeLifecycleListener],
  exports: [OnboardingTemplateModule, OnboardingPlanModule, OnboardingTaskModule],
})
export class OnboardingModule {}
