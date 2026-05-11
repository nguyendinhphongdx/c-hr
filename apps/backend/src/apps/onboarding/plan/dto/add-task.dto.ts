import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AddTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsUUID()
  assigneeUserId!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  /** Float — drag-sort midpoint. Default appended at end (max + 1000). */
  @IsOptional()
  @IsNumber()
  order?: number;
}
