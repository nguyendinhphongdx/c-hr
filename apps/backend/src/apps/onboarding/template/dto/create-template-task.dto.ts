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

export class CreateTemplateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(AssigneeRole)
  defaultAssigneeRole?: AssigneeRole;

  /** Required when defaultAssigneeRole === CUSTOM. */
  @IsOptional()
  @IsUUID()
  defaultAssigneeUserId?: string | null;

  /** Days from employee.hireDate. Negative allowed for "before hire" tasks. */
  @IsOptional()
  @IsInt()
  dueOffsetDays?: number;
}
