import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  /** Pass null explicitly to detach from parent (move to root). */
  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  /** Pass null explicitly to clear manager. */
  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsUUID()
  managerId?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9-_]+$/, {
    message: 'code must contain letters, digits, hyphens or underscores only',
  })
  code?: string;
}
