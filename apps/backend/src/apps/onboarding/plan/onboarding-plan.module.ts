import { Module } from '@nestjs/common';

import { OnboardingPlanController } from './onboarding-plan.controller';
import { OnboardingPlanRepository } from './onboarding-plan.repository';
import { OnboardingPlanService } from './onboarding-plan.service';

@Module({
  controllers: [OnboardingPlanController],
  providers: [OnboardingPlanService, OnboardingPlanRepository],
  exports: [OnboardingPlanService, OnboardingPlanRepository],
})
export class OnboardingPlanModule {}
