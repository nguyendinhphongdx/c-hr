import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListTimersDto {
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  /** YYYY-MM-DD inclusive lower bound (matched against `startedAt`). */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** YYYY-MM-DD inclusive upper bound (matched against `startedAt`). */
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SummaryTimersDto {
  /** YYYY-MM-DD inclusive lower bound (matched against `startedAt`). */
  @IsDateString()
  from!: string;

  /** YYYY-MM-DD inclusive upper bound (matched against `startedAt`). */
  @IsDateString()
  to!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
