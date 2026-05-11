import { Module } from '@nestjs/common';

import { OnboardingTemplateModule } from './template/onboarding-template.module';

/**
 * Onboarding bounded context — F10.
 *
 * Phase 1 (current): OnboardingTemplate CRUD with nested template-task
 * management. Admin-only — gated by HRM appadmin at service entry.
 *
 * Phase 2 (deferred): OnboardingPlan service + Employee.create lifecycle
 * hook (auto-apply default template when a new Employee is provisioned).
 *
 * Phase 3+ (deferred): OnboardingTask service, MyOnboardingView FE,
 * Collaboration/Comments integration.
 */
@Module({
  imports: [OnboardingTemplateModule],
  exports: [OnboardingTemplateModule],
})
export class OnboardingModule {}
