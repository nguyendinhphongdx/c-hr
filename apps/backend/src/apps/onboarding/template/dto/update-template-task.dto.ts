import { AssigneeRole } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateTemplateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(AssigneeRole)
  defaultAssigneeRole?: AssigneeRole;

  @IsOptional()
  @IsUUID()
  defaultAssigneeUserId?: string | null;

  @IsOptional()
  @IsInt()
  dueOffsetDays?: number;
}
