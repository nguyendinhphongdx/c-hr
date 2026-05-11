import { Module } from '@nestjs/common';

import { OnboardingTemplateController } from './onboarding-template.controller';
import { OnboardingTemplateRepository } from './onboarding-template.repository';
import { OnboardingTemplateService } from './onboarding-template.service';

@Module({
  controllers: [OnboardingTemplateController],
  providers: [OnboardingTemplateService, OnboardingTemplateRepository],
  exports: [OnboardingTemplateService, OnboardingTemplateRepository],
})
export class OnboardingTemplateModule {}
