import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListUsersDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /**
   * When true, only return users not yet linked to an Employee. Useful for
   * the "pick user to link" picker when creating a new Employee.
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  availableForLink?: boolean;

  /**
   * When picking a user during Employee *edit*, include the user currently
   * linked to this employee so the picker can show / keep them selected.
   */
  @IsOptional()
  @IsUUID()
  includeLinkedTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
