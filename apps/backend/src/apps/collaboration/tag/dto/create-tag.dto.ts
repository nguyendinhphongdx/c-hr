import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(63)
  name!: string;

  /** Hex color in `#RRGGBB` form (7 chars). Used by FE chip. */
  @IsHexColor()
  color!: string;

  @IsOptional()
  @IsString()
  @MaxLength(31)
  scope?: string;
}
