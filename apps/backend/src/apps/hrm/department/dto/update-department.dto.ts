import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

// Global ValidationPipe has `enableImplicitConversion: true`, which would
// otherwise coerce null → "null" for `string` fields and break the IsUUID
// check. Keep null as null so IsOptional skips validation.
const passThrough = ({ value }: { value: unknown }) => value;

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  /** Pass null explicitly to detach from parent (move to root). */
  @Transform(passThrough)
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  /** Pass null explicitly to clear manager. */
  @Transform(passThrough)
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
