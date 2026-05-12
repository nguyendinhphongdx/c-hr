import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Period filter. Pass `year` for the common "show this year's holidays"
 * case; or `from`/`to` for an arbitrary window. When both `year` and
 * `from`/`to` are present, `from`/`to` wins.
 */
export class ListHolidaysDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(2999)
  year?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
