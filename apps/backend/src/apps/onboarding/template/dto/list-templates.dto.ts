import { IsBooleanString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListTemplatesDto {
  /** Search across `name` (case-insensitive contains). */
  @IsOptional()
  @IsString()
  @MaxLength(127)
  q?: string;

  /** When `"true"`, only active templates. When `"false"`, only inactive. Default: all. */
  @IsOptional()
  @IsBooleanString()
  active?: string;
}
