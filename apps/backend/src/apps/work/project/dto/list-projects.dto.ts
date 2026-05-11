import { ProjectStatus } from '@prisma/client';
import { IsBooleanString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListProjectsDto {
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  /** Search across `name` (case-insensitive contains). */
  @IsOptional()
  @IsString()
  @MaxLength(127)
  q?: string;

  /** When `"true"`, include archived projects. Defaults to excluding them. */
  @IsOptional()
  @IsBooleanString()
  includeArchived?: string;
}
