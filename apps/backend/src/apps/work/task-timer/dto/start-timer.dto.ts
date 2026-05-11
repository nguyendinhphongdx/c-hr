import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class StartTimerDto {
  @IsUUID()
  taskId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  note?: string;
}
