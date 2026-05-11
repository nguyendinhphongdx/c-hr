import { IsBooleanString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { TaskStatusDto } from './shared.dto';

export class ListTasksDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @IsOptional()
  @IsEnum(TaskStatusDto)
  status?: TaskStatusDto;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(127)
  q?: string;

  /** `"true"` to include DONE/CANCELLED. Defaults to hiding them. */
  @IsOptional()
  @IsBooleanString()
  includeDone?: string;
}
