import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ReassignTaskDto {
  @IsUUID()
  assigneeUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1023)
  note?: string;
}
