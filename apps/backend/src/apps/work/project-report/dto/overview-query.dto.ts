import { IsDateString, IsOptional } from 'class-validator';

/**
 * Optional window for the per-project overview. Defaults at service level:
 *   `to`   = today
 *   `from` = max(project.createdAt, to - 30d)
 * Both are inclusive day bounds (YYYY-MM-DD).
 */
export class ProjectOverviewQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
