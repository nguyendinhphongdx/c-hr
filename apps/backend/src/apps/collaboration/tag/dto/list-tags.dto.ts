import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListTagsDto {
  /** Filter by `scope` exact value. Use string `"null"` to fetch only
   *  global tags; omit to return everything (global + scoped). */
  @IsOptional()
  @IsString()
  @MaxLength(31)
  scope?: string;

  /** Case-insensitive search on `name`. */
  @IsOptional()
  @IsString()
  @MaxLength(63)
  q?: string;
}
