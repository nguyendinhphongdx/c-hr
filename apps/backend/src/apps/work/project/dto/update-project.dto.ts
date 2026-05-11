import { ProjectStatus, ProjectVisibility } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * PATCH semantics — fields omitted stay unchanged. Member edits go via
 * /projects/:id/members; section edits via /projects/:id/sections.
 */
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(127)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectVisibility)
  visibility?: ProjectVisibility;

  @IsOptional()
  @IsString()
  @MaxLength(9)
  color?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(31)
  icon?: string | null;

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}
