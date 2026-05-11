import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePlanDto {
  @IsUUID()
  employeeId!: string;

  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1023)
  note?: string;
}
