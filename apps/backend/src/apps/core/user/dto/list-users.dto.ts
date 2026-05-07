import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Generic Org user list — searchable by name/email. The endpoint stays
 * filter-agnostic; consumers (UserPicker etc.) apply use-case-specific
 * predicates client-side via a `filter` prop.
 */
export class ListUsersDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
