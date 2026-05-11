import { OnboardingPlanStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListPlansDto {
  @IsOptional()
  @IsEnum(OnboardingPlanStatus)
  status?: OnboardingPlanStatus;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
